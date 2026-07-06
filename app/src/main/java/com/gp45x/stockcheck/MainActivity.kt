package com.gp45x.stockcheck

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.gp45x.stockcheck.data.api.SyncManager
import com.gp45x.stockcheck.data.db.AppDatabase
import kotlinx.coroutines.launch

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
                    prefs.edit().putBoolean("first_run", false).apply()
                    // Navigate to settings for sync
                    navController.navigate(R.id.settingsFragment)
                } else {
                    prefs.edit().putBoolean("first_run", false).apply()
                }
            }
        }
    }
}
