package com.gp45x.stockcheck.data.api

import android.content.Context
import com.gp45x.stockcheck.data.db.AppDatabase
import com.gp45x.stockcheck.data.model.Item
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SyncManager(private val context: Context) {

    data class SyncProgress(val status: String, val percent: Int, val detail: String = "")

    private suspend fun getApi(): ApiService {
        val prefs = context.getSharedPreferences("gp45_prefs", Context.MODE_PRIVATE)
        val ip = prefs.getString("server_ip", "192.168.1.200") ?: "192.168.1.200"
        return ApiService.create("http://$ip")
    }

    suspend fun syncAll(onProgress: (SyncProgress) -> Unit): Result<Int> = withContext(Dispatchers.IO) {
        try {
            onProgress(SyncProgress("Ping server...", 5))
            val api = getApi()
            val response = api.syncData()

            onProgress(SyncProgress("Membaca data...", 20))
            val body = response.string()

            onProgress(SyncProgress("Parse JSON...", 40))
            val type = object : TypeToken<Map<String, List<Map<String, Any>>>>() {}.type
            val data: Map<String, List<Map<String, Any>>> = Gson().fromJson(body, type)

            val rawItems = data["items"] ?: data["data"] ?: emptyList()
            if (rawItems.isEmpty()) return@withContext Result.failure(Exception("Data kosong"))

            onProgress(SyncProgress("Menyimpan ${rawItems.size} item...", 60))

            val items = rawItems.map { raw ->
                Item(
                    kode = (raw["Kode"] as? String) ?: (raw["kode"] as? String) ?: "",
                    nama = (raw["Nama"] as? String) ?: (raw["nama"] as? String) ?: "",
                    barcode = (raw["Barcode"] as? String) ?: (raw["barcode"] as? String) ?: (raw["BarcodeAktif"] as? String) ?: "",
                    satuan = (raw["Satuan"] as? String) ?: (raw["satuan"] as? String) ?: "",
                    merek = (raw["Merek"] as? String) ?: (raw["merek"] as? String) ?: "",
                    hargaJual = ((raw["HJual"] as? Number)?.toLong()) ?: ((raw["harga_jual"] as? Number)?.toLong()) ?: 0,
                    hargaBeli = ((raw["HBeli"] as? Number)?.toLong()) ?: ((raw["harga_beli"] as? Number)?.toLong()) ?: 0,
                    stokGp45 = ((raw["Stok"] as? Number)?.toInt()) ?: ((raw["gp45"] as? Number)?.toInt()) ?: 0,
                    stokGp = ((raw["gp"] as? Number)?.toInt()) ?: 0,
                    stokMct = ((raw["mct"] as? Number)?.toInt()) ?: 0,
                    stokGh = ((raw["gh"] as? Number)?.toInt()) ?: 0,
                    stokGhm = ((raw["ghm"] as? Number)?.toInt()) ?: 0,
                    stokGha = ((raw["gha"] as? Number)?.toInt()) ?: 0,
                    stokGhb = ((raw["ghb"] as? Number)?.toInt()) ?: 0,
                    stokHo = ((raw["ho"] as? Number)?.toInt()) ?: 0,
                    hargaHk = ((raw["HK"] as? Number)?.toLong()) ?: ((raw["hk"] as? Number)?.toLong()) ?: ((raw["harga_hk"] as? Number)?.toLong()) ?: 0,
                    hkNumber = (raw["HK_Nama"] as? String) ?: (raw["hk_number"] as? String) ?: (raw["no_hk"] as? String) ?: "",
                    hkExpire = (raw["HK_Expiry"] as? String) ?: (raw["hk_expire"] as? String) ?: (raw["expire_hk"] as? String) ?: "",
                    hargaH2 = ((raw["HJual2"] as? Number)?.toLong()) ?: ((raw["h2"] as? Number)?.toLong()) ?: 0,
                    hargaH3 = ((raw["HJual3"] as? Number)?.toLong()) ?: ((raw["h3"] as? Number)?.toLong()) ?: 0,
                    updatedAt = ""
                )
            }

            onProgress(SyncProgress("Menyimpan ke database...", 80))
            val db = AppDatabase.getInstance(context)
            db.itemDao().deleteAll()
            db.itemDao().insertAll(items)

            val count = db.itemDao().count()
            onProgress(SyncProgress("Selesai! $count item tersimpan", 100))
            return@withContext Result.success(count)
        } catch (e: Exception) {
            return@withContext Result.failure(e)
        }
    }
}
