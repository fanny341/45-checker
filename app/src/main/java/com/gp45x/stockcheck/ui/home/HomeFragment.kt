package com.gp45x.stockcheck.ui.home

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.gp45x.stockcheck.R
import com.gp45x.stockcheck.data.api.StockRepository
import com.gp45x.stockcheck.data.model.Item
import com.gp45x.stockcheck.databinding.FragmentHomeBinding
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {
    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val repository by lazy { StockRepository(requireContext()) }
    private val adapter = ItemAdapter { item -> showDetail(item) }
    private var searchJob: Job? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        binding.searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                searchJob?.cancel()
                searchJob = lifecycleScope.launch {
                    delay(300)
                    val q = s?.toString()?.trim() ?: ""
                    if (q.length >= 2) {
                        val results = repository.search(q)
                        adapter.submitList(results)
                        adapter.setQuery(q)
                        binding.emptyText.visibility = if (results.isEmpty()) View.VISIBLE else View.GONE
                    } else {
                        adapter.submitList(emptyList())
                        binding.emptyText.visibility = View.GONE
                    }
                }
            }
        })

        loadRecent()
    }

    private fun loadRecent() {
        lifecycleScope.launch {
            val items = repository.getRecent()
            items.collect { list ->
                adapter.submitList(list)
                binding.emptyText.visibility = View.GONE
            }
        }
    }

    private fun showDetail(item: Item) {
        try {
            val ft = parentFragmentManager.beginTransaction()
            val prev = parentFragmentManager.findFragmentByTag("detail")
            if (prev != null) ft.remove(prev)
            ft.addToBackStack(null)
            val detail = com.gp45x.stockcheck.ui.detail.DetailFragment.newInstance(item.kode)
            ft.replace(R.id.nav_host_fragment, detail, "detail")
            ft.commit()
        } catch (e: Exception) {
            // Fallback: try using navController
            try {
                findNavController().navigate(R.id.homeFragment)
            } catch (_: Exception) {}
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
