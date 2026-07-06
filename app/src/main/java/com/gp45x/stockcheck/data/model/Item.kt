package com.gp45x.stockcheck.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

@Entity(tableName = "items")
data class Item(
    @PrimaryKey val kode: String = "",
    val nama: String = "",
    val barcode: String = "",
    val satuan: String = "",
    val merek: String = "",
    @ColumnInfo(name = "harga_jual") val hargaJual: Long = 0,
    @ColumnInfo(name = "harga_beli") val hargaBeli: Long = 0,
    @ColumnInfo(name = "stok_gp45") val stokGp45: Int = 0,
    @ColumnInfo(name = "stok_gp") val stokGp: Int = 0,
    @ColumnInfo(name = "stok_mct") val stokMct: Int = 0,
    @ColumnInfo(name = "stok_gh") val stokGh: Int = 0,
    @ColumnInfo(name = "stok_ghm") val stokGhm: Int = 0,
    @ColumnInfo(name = "stok_gha") val stokGha: Int = 0,
    @ColumnInfo(name = "stok_ghb") val stokGhb: Int = 0,
    @ColumnInfo(name = "stok_ho") val stokHo: Int = 0,
    @ColumnInfo(name = "harga_hk") val hargaHk: Long = 0,
    @ColumnInfo(name = "hk_number") val hkNumber: String = "",
    @ColumnInfo(name = "hk_expire") val hkExpire: String = "",
    @ColumnInfo(name = "harga_h2") val hargaH2: Long = 0,
    @ColumnInfo(name = "harga_h3") val hargaH3: Long = 0,
    @ColumnInfo(name = "updated_at") val updatedAt: String = ""
) {
    val totalStok: Int get() = stokGp45 + stokGp + stokMct + stokGh + stokGhm + stokGha + stokGhb + stokHo
}

@Entity(tableName = "items_fts")
data class ItemFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowid: Int = 0,
    @ColumnInfo(name = "nama") val nama: String = "",
    @ColumnInfo(name = "barcode") val barcode: String = ""
)

data class OmsetSales(
    val sales: String = "",
    val trans: Int = 0,
    val total: Long = 0,
    val items: Int = 0
)

data class OmsetResponse(
    val sales: List<OmsetSales> = emptyList(),
    @ColumnInfo(name = "grand_total") val grandTotal: Long = 0,
    @ColumnInfo(name = "total_trans") val totalTrans: Int = 0,
    val start: String = "",
    val end: String = ""
)
