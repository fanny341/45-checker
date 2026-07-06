package com.gp45x.stockcheck.data.db

import androidx.room.*
import com.gp45x.stockcheck.data.model.Item
import kotlinx.coroutines.flow.Flow

@Dao
interface ItemDao {
    @Query("SELECT * FROM items ORDER BY CASE WHEN stok_gp45 > 0 THEN 0 ELSE 1 END, nama ASC LIMIT 50")
    fun getRecent(): Flow<List<Item>>

    @Query("SELECT * FROM items WHERE kode = :kode LIMIT 1")
    suspend fun getByKode(kode: String): Item?

    @Query("SELECT * FROM items WHERE barcode = :barcode LIMIT 1")
    suspend fun getByBarcode(barcode: String): Item?

    @RawQuery(observedEntities = [Item::class])
    fun searchFts(query: androidx.sqlite.db.SupportSQLiteQuery): Flow<List<Item>>

    @Query("SELECT * FROM items WHERE nama LIKE '%' || :q || '%' OR barcode LIKE '%' || :q || '%' LIMIT 20")
    suspend fun searchSimple(q: String): List<Item>

    @Query("SELECT * FROM items WHERE kode = :kode LIMIT 1")
    suspend fun getItem(kode: String): Item?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<Item>)

    @Query("DELETE FROM items")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM items")
    suspend fun count(): Int
}
