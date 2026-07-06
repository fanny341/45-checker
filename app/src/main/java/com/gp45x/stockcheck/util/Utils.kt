package com.gp45x.stockcheck.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

fun openUrl(context: Context, url: String) {
    try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    } catch (e: Exception) {
        Toast.makeText(context, "Gagal buka URL", Toast.LENGTH_SHORT).show()
    }
}

fun formatRupiah(amount: Long): String {
    return "Rp${String.format("%,d", amount).replace(",", ".")}"
}

fun getServerIp(context: Context): String {
    val prefs = context.getSharedPreferences("gp45_prefs", Context.MODE_PRIVATE)
    return prefs.getString("server_ip", "192.168.1.200") ?: "192.168.1.200"
}

fun saveServerIp(context: Context, ip: String) {
    val prefs = context.getSharedPreferences("gp45_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("server_ip", ip).apply()
}
