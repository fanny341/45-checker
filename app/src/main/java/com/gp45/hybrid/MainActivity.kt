package com.gp45.hybrid

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var rootLayout: FrameLayout
    private lateinit var scannerBridge: ScannerBridge

    // ========== BRIDGE: Utils ==========

    inner class UtilsBridge {
        @JavascriptInterface
        fun copyToClipboard(text: String) {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText(text, text))
        }

        @JavascriptInterface
        fun vibrate(ms: Long) {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= 26) {
                vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                vibrator.vibrate(ms)
            }
        }

        @JavascriptInterface
        fun getVersion(): String {
            return "1.0.0"
        }
    }

    // ========== BRIDGE: Database ==========

    inner class DatabaseBridge {
        private var items: List<Map<String, Any>>? = null
        private var loaded = false

        @JavascriptInterface
        fun loadDatabase(): String {
            if (loaded) return "OK"
            return try {
                val gson = Gson()
                val files = listOf("data_0.json", "data_1.json", "data_2.json", "data_3.json", "data_4.json")
                val allItems = mutableListOf<Map<String, Any>>()
                for (file in files) {
                    try {
                        val inputStream = assets.open(file)
                        val reader = BufferedReader(InputStreamReader(inputStream))
                        val json = reader.readText()
                        reader.close()
                        val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                        val chunk: List<Map<String, Any>> = gson.fromJson(json, type)
                        allItems.addAll(chunk)
                    } catch (_: Exception) {}
                }
                items = allItems
                loaded = true
                "OK"
            } catch (e: Exception) {
                "ERROR:${e.message}"
            }
        }

        @JavascriptInterface
        fun search(query: String): String {
            if (!loaded || items == null) return "[]"
            val q = query.lowercase().trim()
            if (q.length < 2) return "[]"
            val results = items!!.filter { item ->
                val nama = (item["Nama"] as? String) ?: (item["n"] as? String) ?: ""
                val barcode = (item["Barcode"] as? String) ?: (item["b"] as? String) ?: ""
                val kode = (item["Kode"] as? String) ?: (item["k"] as? String) ?: ""
                nama.lowercase().contains(q) || barcode.contains(q) || kode.contains(q)
            }.take(50)
            return Gson().toJson(results)
        }

        @JavascriptInterface
        fun getByBarcode(barcode: String): String {
            if (!loaded || items == null) return "null"
            val result = items!!.find {
                (it["Barcode"] as? String) == barcode ||
                (it["Kode"] as? String) == barcode ||
                (it["b"] as? String) == barcode ||
                (it["k"] as? String) == barcode
            }
            return if (result != null) Gson().toJson(result) else "null"
        }

        @JavascriptInterface
        fun getItemCount(): Int {
            return items?.size ?: 0
        }
    }

    // ========== BRIDGE: Scanner ==========

    inner class ScannerBridge {
        private var scanCallback: String? = null
        private var cameraProvider: ProcessCameraProvider? = null
        private var previewView: PreviewView? = null
        private var isScanning = false

        @JavascriptInterface
        fun startScan(callbackJs: String) {
            scanCallback = callbackJs
            isScanning = true
            runOnUiThread {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(arrayOf(Manifest.permission.CAMERA), 100)
                    return@runOnUiThread
                }
                startCameraScan()
            }
        }

        fun startCameraScan() {
            try {
                val cameraProviderFuture = ProcessCameraProvider.getInstance(this@MainActivity)
                cameraProviderFuture.addListener({
                    try {
                        cameraProvider = cameraProviderFuture.get()
                        
                        // Create and add PreviewView overlay
                        if (previewView == null) {
                            previewView = PreviewView(this@MainActivity).apply {
                                layoutParams = FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                scaleType = PreviewView.ScaleType.FILL_CENTER
                            }
                            rootLayout.addView(previewView)
                            
                            // Close button overlay
                            val closeBtn = android.widget.Button(this@MainActivity).apply {
                                text = "✕"
                                setOnClickListener { stopScan() }
                                layoutParams = FrameLayout.LayoutParams(
                                    dpToPx(this@MainActivity, 48f),
                                    dpToPx(this@MainActivity, 48f)
                                ).apply {
                                    gravity = android.view.Gravity.TOP or android.view.Gravity.END
                                    setMargins(0, 48, 16, 0)
                                }
                                textSize = 20f
                                setTextColor(android.graphics.Color.WHITE)
                                setBackgroundColor(android.graphics.Color.argb(180, 0, 0, 0))
                            }
                            rootLayout.addView(closeBtn)
                            closeBtn.bringToFront()
                        }
                        previewView?.visibility = android.view.View.VISIBLE

                        val preview = Preview.Builder().build()
                        preview.setSurfaceProvider(previewView?.surfaceProvider)

                        val barcodeOptions = com.google.mlkit.vision.barcode.BarcodeScannerOptions.Builder()
                            .setBarcodeFormats(
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_EAN_13,
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_CODE_128,
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_CODE_39,
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_EAN_8,
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_UPC_A,
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_QR_CODE
                            ).build()
                        val barcodeScanner = BarcodeScanning.getClient(barcodeOptions)

                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                        imageAnalysis.setAnalyzer(Executors.newSingleThreadExecutor()) { imageProxy ->
                            if (!isScanning) { imageProxy.close(); return@setAnalyzer }
                            processImage(imageProxy, barcodeScanner)
                        }

                        cameraProvider?.bindToLifecycle(
                            this@MainActivity,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            imageAnalysis
                        )
                    } catch (e: Exception) {
                        sendScanResult("ERROR:${e.message}")
                    }
                }, ContextCompat.getMainExecutor(this@MainActivity))
            } catch (e: Exception) {
                sendScanResult("ERROR:${e.message}")
            }
        }

        private fun processImage(imageProxy: ImageProxy, scanner: com.google.mlkit.vision.barcode.BarcodeScanner) {
            val mediaImage = imageProxy.image
            if (mediaImage == null) { imageProxy.close(); return }

            val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(inputImage)
                .addOnSuccessListener { barcodes ->
                    for (barcode in barcodes) {
                        val value = barcode.rawValue
                        if (!value.isNullOrBlank()) {
                            isScanning = false
                            cameraProvider?.unbindAll()
                            // Remove preview overlay
                            runOnUiThread { removeScannerOverlay() }
                            sendScanResult(value)
                            break
                        }
                    }
                }
                .addOnCompleteListener { imageProxy.close() }
        }

        private fun removeScannerOverlay() {
            previewView?.let { rootLayout.removeView(it); previewView = null }
            // Remove close button too
            for (i in 0 until rootLayout.childCount) {
                val child = rootLayout.getChildAt(i)
                if (child is android.widget.Button && child.text == "✕") {
                    rootLayout.removeView(child)
                    break
                }
            }
        }

        private fun sendScanResult(result: String) {
            scanCallback?.let { cb ->
                runOnUiThread {
                    webView.evaluateJavascript("javascript:($cb)('${result.replace("'", "\\'")}')", null)
                }
            }
        }

        @JavascriptInterface
        fun stopScan() {
            isScanning = false
            try { cameraProvider?.unbindAll() } catch (_: Exception) {}
            runOnUiThread { removeScannerOverlay() }
        }
    }

    // ========== LIFECYCLE ==========

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Root layout: FrameLayout with WebView + optional scanner overlay
        rootLayout = FrameLayout(this)
        
        webView = WebView(this)
        webView.layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        rootLayout.addView(webView)

        setContentView(rootLayout)

        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.allowFileAccessFromFileURLs = true
        webSettings.allowUniversalAccessFromFileURLs = true
        webSettings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest) {
                request.grant(request.resources)
            }
        }
        webView.webViewClient = WebViewClient()

        // Register bridges
        webView.addJavascriptInterface(UtilsBridge(), "AndroidUtils")
        webView.addJavascriptInterface(DatabaseBridge(), "AndroidDB")
        scannerBridge = ScannerBridge()
        webView.addJavascriptInterface(scannerBridge, "AndroidScanner")

        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 100 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            if (::scannerBridge.isInitialized) {
                scannerBridge.startCameraScan()
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        if (keyCode == android.view.KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}

// Helper to convert dp to px
fun dpToPx(context: Context, dp: Float): Int {
    return (dp * context.resources.displayMetrics.density).toInt()
}
