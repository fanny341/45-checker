package com.gp45x.stockcheck.ui.settings

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.gp45x.stockcheck.data.api.SyncManager
import com.gp45x.stockcheck.data.db.AppDatabase
import com.gp45x.stockcheck.databinding.FragmentSettingsBinding
import com.gp45x.stockcheck.util.getServerIp
import com.gp45x.stockcheck.util.saveServerIp
import com.gp45x.stockcheck.util.openUrl
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

class SettingsFragment : Fragment() {
    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.etServerIp.setText(getServerIp(requireContext()))

        binding.btnSaveIp.setOnClickListener {
            val ip = binding.etServerIp.text.toString().trim()
            if (ip.isNotBlank()) {
                saveServerIp(requireContext(), ip)
                binding.tvStatus.text = "✅ IP tersimpan: $ip"
            }
        }

        binding.btnSync.setOnClickListener { startSync() }
        binding.tvDbCount.text = "Memuat..."
        updateDbCount()

        binding.btnWebVersion.setOnClickListener {
            openUrl(requireContext(), "https://gp45-relay.xmoritzu.workers.dev/")
        }
    }

    private fun updateDbCount() {
        lifecycleScope.launch {
            val count = AppDatabase.getInstance(requireContext()).itemDao().count()
            binding.tvDbCount.text = "$count item tersimpan"
        }
    }

    private fun startSync() {
        val syncManager = SyncManager(requireContext())
        lifecycleScope.launch {
            binding.btnSync.isEnabled = false
            binding.tvStatus.text = "Mulai sync..."
            binding.progressBar.visibility = View.VISIBLE
            binding.progressBar.progress = 0

            val result = syncManager.syncAll { progress ->
                // UI updates must run on Main thread
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                    binding.tvStatus.text = progress.status
                    binding.progressBar.progress = progress.percent
                }
            }

            result.fold(
                onSuccess = { count ->
                    binding.tvStatus.text = "✅ Sync selesai! $count item"
                    updateDbCount()
                },
                onFailure = { err ->
                    binding.tvStatus.text = "❌ Gagal: ${err.message}"
                }
            )
            binding.progressBar.visibility = View.GONE
            binding.btnSync.isEnabled = true
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
