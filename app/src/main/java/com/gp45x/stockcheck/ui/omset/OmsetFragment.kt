package com.gp45x.stockcheck.ui.omset

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.gp45x.stockcheck.data.api.ApiService
import com.gp45x.stockcheck.data.model.OmsetSales
import com.gp45x.stockcheck.databinding.FragmentOmsetBinding
import com.gp45x.stockcheck.util.formatRupiah
import com.gp45x.stockcheck.util.getServerIp
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class OmsetFragment : Fragment() {
    private var _binding: FragmentOmsetBinding? = null
    private val binding get() = _binding!!
    private val adapter = OmsetAdapter()
    private var isBulan = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentOmsetBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        binding.btnHarian.setOnClickListener { loadHarian() }
        binding.btnBulan.setOnClickListener { loadBulan() }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        binding.datePicker.setText(today)
        loadHarian()
    }

    private fun loadHarian() {
        isBulan = false
        binding.btnHarian.setBackgroundColor(0xFF1976D2.toInt())
        binding.btnBulan.setBackgroundColor(0xFF757575.toInt())
        binding.tvTitle.text = "Omset Harian"
        fetchOmset("omset")
    }

    private fun loadBulan() {
        isBulan = true
        binding.btnBulan.setBackgroundColor(0xFF1976D2.toInt())
        binding.btnHarian.setBackgroundColor(0xFF757575.toInt())
        binding.tvTitle.text = "Omset Bulan Ini"
        fetchOmset("omset-bulan")
    }

    private fun fetchOmset(action: String) {
        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE
            binding.emptyText.visibility = View.GONE
            try {
                val ip = getServerIp(requireContext())
                val api = ApiService.create("http://$ip")
                val date = binding.datePicker.text.toString()
                val response = withContext(Dispatchers.IO) {
                    if (action == "omset") api.getOmset(date = date)
                    else api.getOmsetBulan(date = date)
                }
                if (response.sales.isEmpty()) {
                    binding.emptyText.visibility = View.VISIBLE
                    binding.emptyText.text = "Tidak ada data"
                } else {
                    adapter.submitList(response.sales)
                    binding.tvGrandTotal.text = "Grand Total: ${formatRupiah(response.grandTotal)}"
                    binding.tvGrandTotal.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                binding.emptyText.visibility = View.VISIBLE
                binding.emptyText.text = "Gagal: ${e.message}"
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
