package com.gp45x.stockcheck.ui.scanner

import androidx.camera.core.ExperimentalGetImage

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Size
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.gp45x.stockcheck.data.api.StockRepository
import com.gp45x.stockcheck.data.model.Item
import com.gp45x.stockcheck.databinding.FragmentScannerBinding
import com.gp45x.stockcheck.ui.detail.DetailFragment
import com.gp45x.stockcheck.util.formatRupiah
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import com.gp45x.stockcheck.R

class ScannerFragment : Fragment() {
    private var _binding: FragmentScannerBinding? = null
    private val binding get() = _binding!!
    private val repository by lazy { StockRepository(requireContext()) }
    private var barcodeScanner: BarcodeScanner? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var isScanning = false
    private var torchOn = false
    private val analysisExecutor = Executors.newSingleThreadExecutor()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentScannerBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_CODE_128, Barcode.FORMAT_CODE_39, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_QR_CODE)
            .build()
        barcodeScanner = BarcodeScanning.getClient(options)

        binding.btnScan.setOnClickListener { requestCamera() }
        binding.btnCloseResult.setOnClickListener { closeResult() }
        binding.btnTorch.setOnClickListener { toggleTorch() }
        binding.previewView.visibility = View.GONE
    }

    private fun requestCamera() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), 100)
            return
        }
        startCamera()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        if (requestCode == 100 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        }
    }

    private fun startCamera() {
        binding.previewView.visibility = View.VISIBLE
        binding.tvStatus.text = "Memulai kamera..."
        binding.btnScan.text = "📷 Scan Aktif"
        isScanning = true

        try {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
            cameraProviderFuture.addListener({
                try {
                    cameraProvider = cameraProviderFuture.get()
                    bindCamera()
                } catch (e: Exception) {
                    binding.tvStatus.text = "❌ Kamera error: ${e.message}"
                    binding.btnScan.text = "📷 Coba Lagi"
                    isScanning = false
                }
            }, ContextCompat.getMainExecutor(requireContext()))
        } catch (e: Exception) {
            binding.tvStatus.text = "❌ Kamera tidak tersedia"
            binding.btnScan.text = "📷 Coba Lagi"
            isScanning = false
        }
    }

    @OptIn(ExperimentalGetImage::class)
@Suppress("INVISIBLE_REFERENCE")
    private fun bindCamera() {
        val provider = cameraProvider ?: return
        provider.unbindAll()

        val preview = Preview.Builder().build()
        preview.setSurfaceProvider(binding.previewView.surfaceProvider)

        val cameraSelector = CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_BACK)
            .build()

        val imageAnalysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setTargetResolution(Size(1280, 720))
            .build()

        imageAnalysis.setAnalyzer(analysisExecutor) { imageProxy ->
            if (!isScanning) { imageProxy.close(); return@setAnalyzer }
            val image = imageProxy.image
            if (image != null) {
                val inputImage = InputImage.fromMediaImage(image, imageProxy.imageInfo.rotationDegrees)
                barcodeScanner?.process(inputImage)
                    ?.addOnSuccessListener { barcodes ->
                        for (barcode in barcodes) {
                            val value = barcode.rawValue ?: continue
                            if (value.isNotBlank()) {
                                isScanning = false
                                lifecycleScope.launch { handleBarcode(value) }
                                break
                            }
                        }
                    }
                    ?.addOnCompleteListener { imageProxy.close() }
            } else {
                imageProxy.close()
            }
        }

        provider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis)
        binding.tvStatus.text = "Arahkan ke barcode"
    }

    private suspend fun handleBarcode(value: String) {
        try {
            var item = repository.getByBarcode(value)
            if (item == null) item = repository.getByKode(value)
            if (item != null) {
                showResult(item)
            } else {
                binding.tvStatus.text = "❌ Tidak ditemukan: $value"
                binding.btnScan.text = "📷 Scan Lagi"
                isScanning = false
            }
        } catch (e: Exception) {
            binding.tvStatus.text = "❌ Error: ${e.message}"
            binding.btnScan.text = "📷 Scan Lagi"
            isScanning = false
        }
    }

    private fun toggleTorch() {
        torchOn = !torchOn
        binding.btnTorch.text = if (torchOn) "🔦 Nyala" else "🔦 Torch"
        try {
            cameraProvider?.let { provider ->
                val camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA,
                    Preview.Builder().build().apply {
                        setSurfaceProvider(binding.previewView.surfaceProvider)
                    })
                camera.cameraControl.enableTorch(torchOn)
            }
        } catch (e: Exception) {
            binding.tvStatus.text = "❌ Torch: ${e.message}"
        }
    }

    private fun showResult(item: Item) {
        binding.resultCard.visibility = View.VISIBLE
        binding.tvResultNama.text = item.nama
        binding.tvResultHarga.text = formatRupiah(item.hargaJual)
        binding.tvResultStok.text = "Stok: ${item.totalStok} ${item.satuan}"
        binding.tvResultKode.text = "Kode: ${item.kode}"
        binding.tvStatus.text = "✅ Ditemukan!"
        binding.resultCard.setOnClickListener {
            val ft = parentFragmentManager.beginTransaction()
            ft.addToBackStack(null)
            ft.replace(R.id.nav_host_fragment, DetailFragment.newInstance(item.kode), "detail")
            ft.commit()
        }
    }

    private fun closeResult() {
        binding.resultCard.visibility = View.GONE
        binding.tvStatus.text = "Tekan tombol untuk scan"
        binding.btnScan.text = "📷 Buka Kamera"
        isScanning = false
        cameraProvider?.unbindAll()
        binding.previewView.visibility = View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        isScanning = false
        cameraProvider?.unbindAll()
        _binding = null
    }

    override fun onDestroy() {
        super.onDestroy()
        analysisExecutor.shutdown()
    }
}
