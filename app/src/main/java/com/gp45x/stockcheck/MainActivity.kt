package com.gp45x.stockcheck

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.gp45x.stockcheck.data.api.SyncManager
import com.gp45x.stockcheck.data.db.AppDatabase
import com.gp45x.stockcheck.data.model.Item
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        findViewById<BottomNavigationView>(R.id.bottomNavigation)
            .setupWithNavController(navController)

        // Check first launch
        lifecycleScope.launch {
            val prefs = getSharedPreferences("gp45_prefs", MODE_PRIVATE)
            val firstRun = prefs.getBoolean("first_run", true)
            if (firstRun) {
                val count = AppDatabase.getInstance(this@MainActivity).itemDao().count()
                if (count == 0) {
                    loadItemsFromAssets()
                    prefs.edit().putBoolean("first_run", false).apply()
                    navController.navigate(R.id.homeFragment)
                } else {
                    prefs.edit().putBoolean("first_run", false).apply()
                }
            }
        }
    }

    private suspend fun loadItemsFromAssets() = withContext(Dispatchers.IO) {
        try {
            val db = AppDatabase.getInstance(this@MainActivity)
            val files = listOf("data_0.json", "data_1.json", "data_2.json", "data_3.json", "data_4.json")
            var total = 0
            for (file in files) {
                val inputStream = assets.open(file)
                val reader = BufferedReader(InputStreamReader(inputStream))
                val json = reader.readText()
                reader.close()

                val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                val rawItems: List<Map<String, Any>> = Gson().fromJson(json, type)
                
                val items = rawItems.map { raw ->
                    Item(
                        kode = (raw["k"] as? String) ?: "",
                        nama = (raw["n"] as? String) ?: "",
                        barcode = (raw["b"] as? String) ?: "",
                        satuan = (raw["s"] as? String) ?: "",
                        merek = (raw["m"] as? String) ?: "",
                        hargaJual = (raw["h"] as? Number)?.toLong() ?: 0,
                        hargaBeli = (raw["hb"] as? Number)?.toLong() ?: 0,
                        stokGp45 = (raw["q"] as? Number)?.toInt() ?: 0,
                        stokGp = (raw["q_gp"] as? Number)?.toInt() ?: 0,
                        stokMct = (raw["q_mct"] as? Number)?.toInt() ?: 0,
                        stokGh = (raw["q_gh"] as? Number)?.toInt() ?: 0,
                        stokGhm = (raw["q_ghm"] as? Number)?.toInt() ?: 0,
                        stokGha = (raw["q_gha"] as? Number)?.toInt() ?: 0,
                        stokGhb = (raw["q_ghb"] as? Number)?.toInt() ?: 0,
                        stokHo = (raw["q_ho"] as? Number)?.toInt() ?: 0,
                        hargaHk = (raw["hk"] as? Number)?.toLong() ?: 0,
                        hkNumber = (raw["hk_nama"] as? String) ?: "",
                        hkExpire = (raw["hk_expiry"] as? String) ?: "",
                        hargaH2 = (raw["h2"] as? Number)?.toLong() ?: 0,
                        hargaH3 = (raw["h3"] as? Number)?.toLong() ?: 0,
                        updatedAt = ""
                    )
                }
                db.itemDao().insertAll(items)
                total += items.size
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
