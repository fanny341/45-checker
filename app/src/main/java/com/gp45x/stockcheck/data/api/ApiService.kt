package com.gp45x.stockcheck.data.api

import com.gp45x.stockcheck.data.model.OmsetResponse
import okhttp3.OkHttpClient
import okhttp3.ResponseBody
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface ApiService {
    @GET("grand.php")
    suspend fun syncData(@Query("key") key: String = "123", @Query("action") action: String = "sync"): ResponseBody

    @GET("grand.php")
    suspend fun getOmset(@Query("key") key: String = "123", @Query("action") action: String = "omset", @Query("date") date: String): OmsetResponse

    @GET("grand.php")
    suspend fun getOmsetBulan(@Query("key") key: String = "123", @Query("action") action: String = "omset-bulan", @Query("date") date: String): OmsetResponse

    companion object {
        fun create(baseUrl: String): ApiService {
            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()

            val url = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"

            return Retrofit.Builder()
                .baseUrl(url)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService::class.java)
        }
    }
}
