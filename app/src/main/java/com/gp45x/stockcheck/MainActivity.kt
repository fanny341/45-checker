package com.gp45x.stockcheck

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.gp45x.stockcheck.data.db.AppDatabase
import com.gp45x.stockcheck.data.model.Item
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        try {
            val navHostFragment = supportFragmentManager
                .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
            val navController = navHostFragment.navController

            findViewById<BottomNavigationView>(R.id.bottomNavigation)
                .setupWithNavController(navController)

            // Check first launch
            lifecycleScope.launch {
                try {
                    val prefs = getSharedPreferences("gp45_prefs", MODE_PRIVATE)
                    val firstRun = prefs.getBoolean("first_run", true)
                    if (firstRun) {
                        val count = AppDatabase.getInstance(this@MainActivity).itemDao().count()
                        if (count == 0) {
                            showLoading("Menyiapkan database...")
                            loadItemsFromAssets()
                            prefs.edit().putBoolean("first_run", false).apply()
                            hideLoading()
                        } else {
                            prefs.edit().putBoolean("first_run", false).apply()
                        }
                    }
                } catch (e: Exception) {
                    hideLoading()
                    android.util.Log.e("GP45", "Init error: " + e.message, e)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("GP45", "onCreate error: " + e.message, e)
        }
    }

    private fun showLoading(text: String) {
        try {
            findViewById<View>(R.id.loadingOverlay)?.let {
                it.visibility = View.VISIBLE
                findViewById<android.widget.TextView>(R.id.tvLoadingText)?.text = text
            }
        } catch (_: Exception) {}
    }

    private fun hideLoading() {
        try {
            findViewById<View>(R.id.loadingOverlay)?.visibility = View.GONE
        } catch (_: Exception) {}
    }

    private suspend fun loadItemsFromAssets() = withContext(Dispatchers.IO) {
        try {
            val db = AppDatabase.getInstance(this@MainActivity)
            val files = listOf("data_0.json", "data_1.json", "data_2.json", "data_3.json", "data_4.json")
            val gson = Gson()

            for (file in files) {
                // Update status
                withContext(Dispatchers.Main) {
                    showLoading("Memuat $file...")
                }

                val json: String
                try {
                    val inputStream = this@MainActivity.assets.open(file)
                    val reader = BufferedReader(InputStreamReader(inputStream))
                    json = reader.readText()
                    reader.close()
                } catch (e: Exception) {
                    android.util.Log.w("GP45", "Skip $file: " + e.message)
                    continue
                }

                val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                val rawItems: List<Map<String, Any>> = gson.fromJson(json, type)
                if (rawItems.isEmpty()) continue

                // Process in batches to reduce memory
                val batchSize = 500
                rawItems.chunked(batchSize).forEachIndexed { idx, batch ->
                    if (idx % 2 == 0) {
                        withContext(Dispatchers.Main) {
                            showLoading("${rawItems.size} item dari $file (${idx * batchSize}/${rawItems.size})")
                        }
                    }
                    val items = batch.map { raw ->
                        Item(
                            kode = (raw["Kode"] as? String) ?: "",
                            nama = (raw["Nama"] as? String) ?: "",
                            barcode = (raw["Barcode"] as? String) ?: "",
                            satuan = (raw["Satuan"] as? String) ?: "",
                            merek = (raw["Merek"] as? String) ?: "",
                            hargaJual = (raw["HJual"] as? Number)?.toLong() ?: 0,
                            hargaBeli = (raw["HBeli"] as? Number)?.toLong() ?: 0,
                            stokGp45 = (raw["Stok"] as? Number)?.toInt() ?: 0,
                            stokGp = 0, stokMct = 0, stokGh = 0,
                            stokGhm = 0, stokGha = 0, stokGhb = 0, stokHo = 0,
                            hargaHk = (raw["HK"] as? Number)?.toLong() ?: 0,
                            hkNumber = (raw["HK_Nama"] as? String) ?: "",
                            hkExpire = (raw["HK_Expiry"] as? String) ?: "",
                            hargaH2 = (raw["HJual2"] as? Number)?.toLong() ?: 0,
                            hargaH3 = (raw["HJual3"] as? Number)?.toLong() ?: 0,
                            updatedAt = ""
                        )
                    }
                    db.itemDao().insertAll(items)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("GP45", "loadItemsFromAssets error", e)
        }
    }
}
