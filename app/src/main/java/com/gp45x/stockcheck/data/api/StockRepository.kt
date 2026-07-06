package com.gp45x.stockcheck.data.api

import android.content.Context
import com.gp45x.stockcheck.data.db.AppDatabase
import com.gp45x.stockcheck.data.model.Item
import kotlinx.coroutines.flow.Flow

class StockRepository(private val context: Context) {
    private val db = AppDatabase.getInstance(context)
    private val itemDao = db.itemDao()

    fun getRecent(): Flow<List<Item>> = itemDao.getRecent()

    suspend fun getByKode(kode: String): Item? = itemDao.getByKode(kode)

    suspend fun getByBarcode(barcode: String): Item? = itemDao.getByBarcode(barcode)

    suspend fun search(q: String): List<Item> {
        if (q.isBlank()) return emptyList()
        return itemDao.searchSimple(q.trim())
    }

    fun searchFlow(q: String): Flow<List<Item>> {
        val query = "SELECT * FROM items WHERE nama LIKE '%${q.replace("'", "''")}%' OR barcode LIKE '%${q.replace("'", "''")}%' LIMIT 20"
        return itemDao.searchFts(androidx.sqlite.db.SimpleSQLiteQuery(query))
    }
}
