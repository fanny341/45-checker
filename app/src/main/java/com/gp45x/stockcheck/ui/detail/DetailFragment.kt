package com.gp45x.stockcheck.ui.detail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.gp45x.stockcheck.data.api.StockRepository
import com.gp45x.stockcheck.data.model.Item
import com.gp45x.stockcheck.databinding.FragmentDetailBinding
import com.gp45x.stockcheck.util.formatRupiah
import kotlinx.coroutines.launch

class DetailFragment : Fragment() {
    private var _binding: FragmentDetailBinding? = null
    private val binding get() = _binding!!

    companion object {
        private const val ARG_KODE = "kode"
        fun newInstance(kode: String) = DetailFragment().apply {
            arguments = Bundle().apply { putString(ARG_KODE, kode) }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val kode = arguments?.getString(ARG_KODE) ?: return
        val repo = StockRepository(requireContext())

        lifecycleScope.launch {
            val item = repo.getByKode(kode)
            if (item != null) showItem(item)
            else binding.tvNama.text = "Item tidak ditemukan"
        }
    }

    private fun showItem(item: Item) {
        binding.tvNama.text = item.nama
        binding.tvHarga.text = formatRupiah(item.hargaJual)
        binding.tvKode.text = "Kode: ${item.kode}"
        binding.tvBarcode.text = "Barcode: ${item.barcode}"
        binding.tvSatuan.text = "Satuan: ${item.satuan}"
        binding.tvMerek.text = "Merek: ${item.merek}"
        binding.tvHargaBeli.text = "Harga Beli: ${formatRupiah(item.hargaBeli)}"

        binding.tvGp45.text = "${item.stokGp45}"
        binding.tvGp.text = "${item.stokGp}"
        binding.tvMct.text = "${item.stokMct}"
        binding.tvGh.text = "${item.stokGh}"
        binding.tvGhm.text = "${item.stokGhm}"
        binding.tvGha.text = "${item.stokGha}"
        binding.tvGhb.text = "${item.stokGhb}"
        binding.tvHo.text = "${item.stokHo}"
        binding.tvTotal.text = "${item.totalStok}"

        // HK info
        if (item.hargaHk > 0 && item.hkNumber.isNotBlank()) {
            binding.hkSection.visibility = View.VISIBLE
            binding.tvHkPrice.text = "${formatRupiah(item.hargaHk)} (${item.hkNumber})"
            binding.tvHkExpire.text = "Exp: ${item.hkExpire}"
        } else {
            binding.hkSection.visibility = View.GONE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
