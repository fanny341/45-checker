package com.gp45x.stockcheck.ui.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.gp45x.stockcheck.data.model.Item
import com.gp45x.stockcheck.databinding.ItemCardBinding
import com.gp45x.stockcheck.util.formatRupiah

class ItemAdapter(private val onClick: (Item) -> Unit) : ListAdapter<Item, ItemAdapter.ViewHolder>(DiffCallback()) {

    private var query: String = ""

    fun setQuery(q: String) { query = q }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Item) {
            binding.tvNama.text = item.nama
            binding.tvKode.text = "${item.merek} • ${item.kode}"
            binding.tvHarga.text = formatRupiah(item.hargaJual)
            binding.tvStok.text = "Stok: ${item.totalStok} ${item.satuan}"

            val outletInfo = buildString {
                append("GP45:${item.stokGp45} GP:${item.stokGp} GH:${item.stokGh}")
                append(" GHM:${item.stokGhm} GHA:${item.stokGha} GHB:${item.stokGhb}")
                append(" HO:${item.stokHo}")
            }
            binding.tvOutlet.text = outletInfo

            binding.root.setOnClickListener { onClick(item) }
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<Item>() {
        override fun areItemsTheSame(old: Item, new: Item) = old.kode == new.kode
        override fun areContentsTheSame(old: Item, new: Item) = old == new
    }
}
