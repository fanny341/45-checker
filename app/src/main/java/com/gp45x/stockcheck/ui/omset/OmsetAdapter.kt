package com.gp45x.stockcheck.ui.omset

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.gp45x.stockcheck.data.model.OmsetSales
import com.gp45x.stockcheck.databinding.ItemOmsetBinding
import com.gp45x.stockcheck.util.formatRupiah

class OmsetAdapter : ListAdapter<OmsetSales, OmsetAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemOmsetBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemOmsetBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: OmsetSales) {
            binding.tvSales.text = item.sales
            binding.tvTotal.text = formatRupiah(item.total)
            binding.tvTrans.text = "${item.trans} trans"
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<OmsetSales>() {
        override fun areItemsTheSame(old: OmsetSales, new: OmsetSales) = old.sales == new.sales
        override fun areContentsTheSame(old: OmsetSales, new: OmsetSales) = old == new
    }
}
