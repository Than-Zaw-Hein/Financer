# ExpendMemo → Financer Mobile Integration Prompts

## Overview

Connect the ExpendMemo Android app (Kotlin + Compose + Room + Hilt) to the Financer web API
(Next.js + Neon PostgreSQL) so both share the same source of truth.

**Sync Pattern:** Mobile sends local data with `uuid` + `updatedAt`. Web compares timestamps — newer version wins.
Server state (`serverData`) replaces local cache after each sync.

---

## Part 1: Dependencies (`app/build.gradle.kts`)

```kotlin
// Retrofit
implementation("com.squareup.retrofit2:retrofit:2.11.0")
implementation("com.squareup.retrofit2:converter-gson:2.11.0")
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
```

---

## Part 2: API Service (`data/network/ApiService.kt`)

### Data Transfer Objects

```kotlin
package com.tzh.expendmemo.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class SyncCategory(
    val name: String,
    val icon: String = "📌",
    val color: String = "#2196F3",
    val uuid: String = java.util.UUID.randomUUID().toString(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isPlanBudget: Boolean = false,
    val budgetAmount: Double? = null
)

data class SyncExpense(
    val name: String,
    val amount: Double,
    val category: String,
    val date: Long,
    val note: String? = null,
    val uuid: String = java.util.UUID.randomUUID().toString(),
    val updatedAt: Long = System.currentTimeMillis()
)

data class SyncIncome(
    val amount: Double,
    val date: Long,
    val note: String? = null,
    val uuid: String = java.util.UUID.randomUUID().toString(),
    val updatedAt: Long = System.currentTimeMillis()
)

data class SyncRequest(
    val categories: List<SyncCategory>,
    val expenses: List<SyncExpense>,
    val income: List<SyncIncome>
)

data class SyncResponse(
    val synced: SyncCounts?,
    val skipped: SyncCounts?,
    val serverData: ServerData?
)

data class SyncCounts(
    val categories: Int,
    val expenses: Int,
    val income: Int
)

data class ServerData(
    val categories: List<ServerCategory>,
    val expenses: List<ServerExpense>,
    val incomes: List<ServerIncome>,
    val month: Int,
    val year: Int
)

data class ServerCategory(
    val id: String,
    val name: String,
    val icon: String,
    val color: String,
    val uuid: String?,
    val isPlanBudget: Boolean?,
    val budgetAmount: Double?,
    val updatedAt: String?
)

data class ServerExpense(
    val id: String,
    val amount: Double,
    val type: String?,
    val name: String?,
    val date: String?,
    val notes: String?,
    val month: Int?,
    val year: Int?,
    val uuid: String?,
    val updatedAt: String?,
    val category: ServerCategory?
)

data class ServerIncome(
    val id: String,
    val amount: Double,
    val month: Int?,
    val year: Int?,
    val receivedDate: String?,
    val notes: String?,
    val uuid: String?,
    val updatedAt: String?,
    val sourceName: String?
)

data class CheckResponse(
    val status: String?,
    val message: String?
)

interface ApiService {
    @GET("api/import")
    suspend fun checkConnection(): Response<CheckResponse>

    @POST("api/sync")
    suspend fun sync(@Body body: SyncRequest): Response<SyncResponse>
}
```

---

## Part 3: Room Entities

### `data/model/entity/CategoryEntity.kt`

```kotlin
package com.tzh.expendmemo.data.model.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val icon: String,
    val color: Long,
    val uuid: String = UUID.randomUUID().toString(),
    val isPlanBudget: Boolean = false,
    val budgetAmount: Double? = null,
    val updatedAt: Long = System.currentTimeMillis()
)
```

### `data/model/entity/TransactionEntity.kt`

```kotlin
package com.tzh.expendmemo.data.model.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val amount: Double,
    val categoryId: Long,
    val date: Long,         // epoch milliseconds
    val note: String = "",
    val type: String = "EXPENSE",  // "EXPENSE" or "INCOME"
    val parentExtraId: Long? = null,
    val uuid: String = UUID.randomUUID().toString(),
    val updatedAt: Long = System.currentTimeMillis()
)
```

### `data/model/entity/IncomeEntity.kt`

```kotlin
package com.tzh.expendmemo.data.model.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "income")
data class IncomeEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val totalIncome: Double,
    val note: String = "",
    val date: Long,         // epoch milliseconds
    val uuid: String = UUID.randomUUID().toString(),
    val updatedAt: Long = System.currentTimeMillis()
)
```

**Note:** `PlanBudgetEntity` is no longer used — budget info is stored directly on `CategoryEntity` as `isPlanBudget` + `budgetAmount`.

---

## Part 4: DAO Methods

### `data/database/CategoryDao.kt`

```kotlin
package com.tzh.expendmemo.data.database

import androidx.room.*
import com.tzh.expendmemo.data.model.entity.CategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(category: CategoryEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<CategoryEntity>)

    @Update
    suspend fun update(category: CategoryEntity)

    @Query("SELECT * FROM categories ORDER BY name ASC")
    suspend fun getAllCategoriesOnce(): List<CategoryEntity>

    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories WHERE name = :name LIMIT 1")
    suspend fun getCategoryByName(name: String): CategoryEntity?

    @Query("SELECT * FROM categories WHERE uuid = :uuid LIMIT 1")
    suspend fun getCategoryByUuid(uuid: String): CategoryEntity?

    @Query("SELECT * FROM categories WHERE id = :id")
    suspend fun getCategoryById(id: Long): CategoryEntity?

    @Query("DELETE FROM categories")
    suspend fun clearAll()
}
```

### `data/database/TransactionDao.kt`

Add these methods:

```kotlin
@Query("SELECT * FROM transactions ORDER BY date DESC")
suspend fun getAllTransactionsOnce(): List<TransactionEntity>

@Query("SELECT * FROM transactions WHERE type = :type ORDER BY date DESC")
suspend fun getTransactionsByType(type: String): List<TransactionEntity>

@Query("SELECT * FROM transactions WHERE uuid = :uuid LIMIT 1")
suspend fun getTransactionByUuid(uuid: String): TransactionEntity?

@Query("DELETE FROM transactions")
suspend fun clearAll()

@Insert(onConflict = OnConflictStrategy.REPLACE)
suspend fun insert(transaction: TransactionEntity): Long

@Update
suspend fun update(transaction: TransactionEntity)
```

### `data/database/IncomeDao.kt`

```kotlin
@Query("SELECT * FROM `income` ORDER BY date DESC")
suspend fun getAllIncomeEntriesOnce(): List<IncomeEntity>

@Query("SELECT * FROM `income` WHERE uuid = :uuid LIMIT 1")
suspend fun getIncomeByUuid(uuid: String): IncomeEntity?

@Query("DELETE FROM `income`")
suspend fun clearAll()

@Insert(onConflict = OnConflictStrategy.REPLACE)
suspend fun insertIncome(income: IncomeEntity): Long

@Update
suspend fun updateIncome(income: IncomeEntity)
```

### PlanBudgetDao.kt — DELETE THIS FILE ENTIRELY

Budget info is now on Category. No more PlanBudget table on the web or mobile.

---

## Part 5: RetrofitProvider (`data/network/RetrofitProvider.kt`)

```kotlin
package com.tzh.expendmemo.data.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitProvider {
    fun create(baseUrl: String): ApiService {
        val normalizedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        val client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
        return Retrofit.Builder()
            .baseUrl(normalizedUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
```

---

## Part 6: SyncRepository (`data/network/SyncRepository.kt`)

This is the core sync logic. Three key methods:

### 6a. `sync()` — Push local data, receive server state

```kotlin
package com.tzh.expendmemo.data.network

import com.tzh.expendmemo.data.database.*
import com.tzh.expendmemo.data.datastore.SettingsDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class SyncRepository(
    private val transactionDao: TransactionDao,
    private val categoryDao: CategoryDao,
    private val incomeDao: IncomeDao,
    private val settingsDataStore: SettingsDataStore
) {
    private var apiService: ApiService? = null

    suspend fun checkConnection(baseUrl: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            apiService = RetrofitProvider.create(baseUrl)
            val response = apiService!!.checkConnection()
            if (response.isSuccessful) {
                Result.success("Connected")
            } else {
                Result.failure(Exception("Server returned ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Cannot connect: ${e.message}"))
        }
    }

    suspend fun sync(): Result<SyncResponse> = withContext(Dispatchers.IO) {
        try {
            val baseUrl = getBaseUrl()
            if (baseUrl.isBlank()) return@withContext Result.failure(Exception("Server URL not set"))
            apiService = RetrofitProvider.create(baseUrl)

            // 1. Collect local data
            val localCategories = categoryDao.getAllCategoriesOnce()
            val localExpenses = transactionDao.getTransactionsByType("EXPENSE")
            val localIncomes = incomeDao.getAllIncomeEntriesOnce()
            val localIncomesAsTxns = transactionDao.getTransactionsByType("INCOME")

            // 2. Map to API format
            val categories = localCategories.map { cat ->
                SyncCategory(
                    name = cat.name,
                    icon = cat.icon,
                    color = cat.color.toHexString(),
                    uuid = cat.uuid,
                    updatedAt = cat.updatedAt,
                    isPlanBudget = cat.isPlanBudget,
                    budgetAmount = cat.budgetAmount
                )
            }

            val expenses = localExpenses.map { tx ->
                val catName = localCategories.find { it.id == tx.categoryId }?.name ?: "Extra"
                SyncExpense(
                    name = tx.note.ifEmpty { catName },
                    amount = tx.amount,
                    category = catName,
                    date = tx.date,
                    note = tx.note,
                    uuid = tx.uuid,
                    updatedAt = tx.updatedAt
                )
            }

            val income = localIncomes.map { inc ->
                SyncIncome(
                    amount = inc.totalIncome,
                    date = inc.date,
                    note = inc.note,
                    uuid = inc.uuid,
                    updatedAt = inc.updatedAt
                )
            }

            // 3. Push to server
            val request = SyncRequest(categories, expenses, income)
            val response = apiService!!.sync(request)

            if (response.isSuccessful) {
                val body = response.body()!!
                // 4. Update last sync time
                val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                settingsDataStore.setLastSync(sdf.format(Date()))

                // 5. Replace local cache with server data
                body.serverData?.let { serverData ->
                    updateLocalCache(serverData)
                }
                Result.success(body)
            } else {
                Result.failure(Exception("Server error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Sync failed: ${e.message}"))
        }
    }
```

### 6b. `updateLocalCache()` — Replace local data with server state

```kotlin
    private suspend fun updateLocalCache(serverData: ServerData) {
        // Build server category ID → name map
        val serverCategoryNames = mutableMapOf<String, String>()
        serverData.categories.forEach { serverCategoryNames[it.id] = it.name }

        // Categories: replace local with server data
        val localCategories = categoryDao.getAllCategoriesOnce()

        for (sc in serverData.categories) {
            if (sc.uuid == null) continue

            val localCat = localCategories.find { it.uuid == sc.uuid }
            val serverTime = parseIsoDate(sc.updatedAt) ?: continue

            if (localCat != null) {
                // Update if server is newer
                if (serverTime > localCat.updatedAt) {
                    categoryDao.update(localCat.copy(
                        name = sc.name,
                        icon = sc.icon,
                        color = parseHexColor(sc.color),
                        budgetAmount = sc.budgetAmount,
                        isPlanBudget = sc.isPlanBudget ?: false,
                        updatedAt = serverTime
                    ))
                }
                // If local is newer → keep local (next sync will push)
            } else {
                // Server has a category we don't → insert
                categoryDao.insert(CategoryEntity(
                    name = sc.name,
                    icon = sc.icon,
                    color = parseHexColor(sc.color),
                    uuid = sc.uuid,
                    isPlanBudget = sc.isPlanBudget ?: false,
                    budgetAmount = sc.budgetAmount,
                    updatedAt = serverTime
                ))
            }
        }

        // Expenses: replace local with server data
        val localExpenses = transactionDao.getAllTransactionsOnce()

        for (se in serverData.expenses) {
            if (se.uuid == null) continue

            val localTx = localExpenses.find { it.uuid == se.uuid }
            val serverTime = parseIsoDate(se.updatedAt) ?: continue

            if (localTx != null) {
                if (serverTime > localTx.updatedAt) {
                    val catId = se.category?.name?.let { catName ->
                        categoryDao.getCategoryByName(catName)?.id
                    } ?: 1L
                    transactionDao.update(localTx.copy(
                        amount = se.amount,
                        categoryId = catId,
                        note = se.notes ?: "",
                        date = parseIsoDate(se.date) ?: localTx.date,
                        updatedAt = serverTime
                    ))
                }
            } else {
                val catId = se.category?.name?.let { catName ->
                    categoryDao.getCategoryByName(catName)?.id
                } ?: 1L
                transactionDao.insert(TransactionEntity(
                    amount = se.amount,
                    categoryId = catId,
                    date = parseIsoDate(se.date) ?: System.currentTimeMillis(),
                    note = se.notes ?: "",
                    type = se.type ?: "EXPENSE",
                    uuid = se.uuid,
                    updatedAt = serverTime
                ))
            }
        }

        // Income: replace local with server data
        val localIncomes = incomeDao.getAllIncomeEntriesOnce()

        for (si in serverData.incomes) {
            if (si.uuid == null) continue

            val localInc = localIncomes.find { it.uuid == si.uuid }
            val serverTime = parseIsoDate(si.updatedAt) ?: continue

            if (localInc != null) {
                if (serverTime > localInc.updatedAt) {
                    incomeDao.updateIncome(localInc.copy(
                        totalIncome = si.amount,
                        note = si.notes ?: "",
                        date = parseIsoDate(si.receivedDate) ?: localInc.date,
                        updatedAt = serverTime
                    ))
                }
            } else {
                incomeDao.insertIncome(IncomeEntity(
                    totalIncome = si.amount,
                    note = si.notes ?: si.sourceName ?: "Income",
                    date = parseIsoDate(si.receivedDate) ?: System.currentTimeMillis(),
                    uuid = si.uuid,
                    updatedAt = serverTime
                ))
            }
        }
    }

    private suspend fun getBaseUrl(): String {
        var url = ""
        settingsDataStore.baseUrl.collect { url = it }
        return url
    }

    private fun parseIsoDate(dateStr: String?): Long? {
        if (dateStr == null) return null
        return try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.parse(dateStr)?.time
        } catch (e: Exception) {
            try {
                // Fallback: try without milliseconds
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.parse(dateStr)?.time
            } catch (e2: Exception) { null }
        }
    }
}

// ── Helper Extensions ──────────────────────────

fun Long.toHexColor(): String {
    val cleaned = this and 0x00FFFFFF
    return "#%06X".format(cleaned)
}

fun parseHexColor(hex: String): Long {
    val clean = hex.removePrefix("#")
    return (0xFF000000 or clean.toLong(16))
}
```

---

## Part 7: SettingsDataStore (`data/datastore/SettingsDataStore.kt`)

```kotlin
package com.tzh.expendmemo.data.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "sync_settings")

class SettingsDataStore(private val context: Context) {

    companion object {
        val KEY_BASE_URL = stringPreferencesKey("base_url")
        val KEY_LAST_SYNC = stringPreferencesKey("last_sync")
    }

    val baseUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_BASE_URL] ?: ""
    }

    val lastSync: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_LAST_SYNC] ?: "Never"
    }

    suspend fun getBaseUrl(): String {
        var url = ""
        baseUrl.collect { url = it }
        return url
    }

    suspend fun setBaseUrl(url: String) {
        context.dataStore.edit { it[KEY_BASE_URL] = url }
    }

    suspend fun setLastSync(time: String) {
        context.dataStore.edit { it[KEY_LAST_SYNC] = time }
    }
}
```

---

## Part 8: Color Helper

### `data/network/ColorHelper.kt`

Mobile stores category colors as `Long` (ARGB). The web expects hex strings like `"#2196F3"`.

```kotlin
package com.tzh.expendmemo.data.network

// Convert Compose Color Long → hex string for web API
fun Long.colorToHex(): String {
    val cleaned = this and 0x00FFFFFF  // remove alpha
    return "#%06X".format(cleaned)
}

// Convert hex string → Compose Color Long for Room
fun hexToColorLong(hex: String): Long {
    val clean = hex.removePrefix("#")
    return (0xFF000000 or clean.toLong(16))
}
```

---

## Part 9: Sync Screen UI

Add this composable to your Settings screen (or create a new `ExportToWebScreen.kt`):

```kotlin
@Composable
fun ExportToWebSection(
    syncRepository: SyncRepository,
    settingsDataStore: SettingsDataStore,
    viewModel: ExportViewModel = hiltViewModel()
) {
    val baseUrl by settingsDataStore.baseUrl.collectAsState(initial = "")
    val lastSync by settingsDataStore.lastSync.collectAsState(initial = "Never")

    var urlInput by remember { mutableStateOf(baseUrl) }
    var isChecking by remember { mutableStateOf(false) }
    var isSyncing by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Export to Web", style = MaterialTheme.typography.titleMedium)
        Text(
            "Connect to your My Finance web app for shared data.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        OutlinedTextField(
            value = urlInput,
            onValueChange = { urlInput = it; statusMessage = null },
            label = { Text("Server URL") },
            placeholder = { Text("http://192.168.1.9:3002") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = {
                    isChecking = true; statusMessage = null
                    viewModel.checkConnection(urlInput, syncRepository) { msg, ok ->
                        statusMessage = msg; isChecking = false
                        if (ok) viewModel.saveUrl(urlInput, settingsDataStore)
                    }
                },
                enabled = !isChecking && urlInput.isNotBlank()
            ) {
                if (isChecking) CircularProgressIndicator(modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Test & Save")
            }
        }

        statusMessage?.let { msg ->
            Surface(
                color = if (msg.contains("Connected"))
                    MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.errorContainer,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(msg, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodyMedium)
            }
        }

        Button(
            onClick = {
                isSyncing = true; statusMessage = null
                viewModel.syncNow(urlInput, syncRepository, settingsDataStore) { msg, ok ->
                    statusMessage = msg; isSyncing = false
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isSyncing && urlInput.isNotBlank()
        ) {
            if (isSyncing) CircularProgressIndicator(modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sync Now")
        }

        Text("Last sync: $lastSync",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
```

---

## Part 10: ExportViewModel (`ui/settings/ExportViewModel.kt`)

```kotlin
package com.tzh.expendmemo.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tzh.expendmemo.data.datastore.SettingsDataStore
import com.tzh.expendmemo.data.network.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ExportViewModel @Inject constructor() : ViewModel() {

    fun checkConnection(
        url: String,
        syncRepository: SyncRepository,
        onResult: (String, Boolean) -> Unit
    ) {
        viewModelScope.launch {
            syncRepository.checkConnection(url).fold(
                onSuccess = { onResult("✅ Connected to server!", true) },
                onFailure = { e -> onResult("❌ ${e.message}", false) }
            )
        }
    }

    fun saveUrl(url: String, settingsDataStore: SettingsDataStore) {
        viewModelScope.launch { settingsDataStore.setBaseUrl(url) }
    }

    fun syncNow(
        url: String,
        syncRepository: SyncRepository,
        settingsDataStore: SettingsDataStore,
        onResult: (String, Boolean) -> Unit
    ) {
        viewModelScope.launch {
            settingsDataStore.setBaseUrl(url)
            syncRepository.sync().fold(
                onSuccess = { response ->
                    val s = response.synced
                    val sk = response.skipped
                    val msg = buildString {
                        if (s != null) append("✅ Synced: ${s.categories} categories, ${s.expenses} expenses, ${s.income} income")
                        if (sk != null && (sk.expenses > 0 || sk.income > 0)) append(". Skipped: ${sk.expenses} expenses, ${sk.income} income")
                    }
                    onResult(msg, true)
                },
                onFailure = { e -> onResult("❌ ${e.message}", false) }
            )
        }
    }
}
```

---

## Part 11: AppDatabase Changes

### `data/database/AppDatabase.kt`

```kotlin
@Database(
    entities = [
        CategoryEntity::class,
        TransactionEntity::class,
        IncomeEntity::class,
        // Note: PlanBudgetEntity was removed — budget is now on CategoryEntity
    ],
    version = 5,  // bump from previous
    exportSchema = false
)
@TypeConverters(ColorConverter::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun categoryDao(): CategoryDao
    abstract fun transactionDao(): TransactionDao
    abstract fun incomeDao(): IncomeDao
}

// Use fallbackToDestructiveMigration() since we're removing PlanBudget
Room.databaseBuilder(context, AppDatabase::class.java, "expend_memo_database")
    .fallbackToDestructiveMigration()
    .build()
```

---

## Part 12: DI Module (`di/AppModule.kt`)

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSettingsDataStore(@ApplicationContext context: Context): SettingsDataStore =
        SettingsDataStore(context)

    @Provides
    @Singleton
    fun provideSyncRepository(
        transactionDao: TransactionDao,
        categoryDao: CategoryDao,
        incomeDao: IncomeDao,
        settingsDataStore: SettingsDataStore
    ): SyncRepository = SyncRepository(
        transactionDao, categoryDao, incomeDao, settingsDataStore
    )
}
```

**Note:** No more `PlanBudgetDao` in DI. Budget is handled via `CategoryEntity.isPlanBudget` + `budgetAmount`.

---

## Part 13: Studio Colors (for web compatibility)

Update the mobile's color list to match web:

In your `CategoryIcon` selection screen, use these 12 colors:

```kotlin
val MOBILE_COLORS = listOf(
    Color(0xFFFFE0B2.toInt()), Color(0xFFC8E6C9.toInt()), Color(0xFF4CAF50.toInt()), Color(0xFFFF5722.toInt()),
    Color(0xFFFF8A65.toInt()), Color(0xFF009688.toInt()), Color(0xFF2196F3.toInt()), Color(0xFF673AB7.toInt()),
    Color(0xFF8BC34A.toInt()), Color(0xFF03A9F4.toInt()), Color(0xFF9C27B0.toInt()), Color(0xFF37474F.toInt()),
)
```

These match the web's color picker exactly — synced colors display correctly on both sides.

---

## Part 14: Handling Deletions (Mobile → Web)

When a user deletes an expense or category on mobile while offline, the web doesn't know. On next sync, the web still has the old record. This section adds a `pending_deletions` table to track what was deleted and send those UUIDs to the web.

### 14a. Pending Deletion Entity

**File:** `data/model/entity/PendingDeletionEntity.kt` — **New**

```kotlin
package com.tzh.expendmemo.data.model.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_deletions")
data class PendingDeletionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val entityType: String,   // "expense", "category", "income"
    val uuid: String
)
```

### 14b. Pending Deletion DAO

**File:** `data/database/PendingDeletionDao.kt` — **New**

```kotlin
package com.tzh.expendmemo.data.database

import androidx.room.*
import com.tzh.expendmemo.data.model.entity.PendingDeletionEntity

@Dao
interface PendingDeletionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: PendingDeletionEntity)

    @Query("SELECT uuid FROM pending_deletions WHERE entityType = :type")
    suspend fun getAllUuids(type: String): List<String>

    @Query("DELETE FROM pending_deletions WHERE entityType = :type")
    suspend fun clearByType(type: String)

    @Query("DELETE FROM pending_deletions")
    suspend fun clearAll()
}
```

### 14c. Update SyncRequest in ApiService.kt

Add deleted UUID arrays:

```kotlin
data class SyncRequest(
    val categories: List<SyncCategory>,
    val expenses: List<SyncExpense>,
    val income: List<SyncIncome>,
    val deletedExpenseUuids: List<String>? = null,    // ← NEW
    val deletedCategoryUuids: List<String>? = null,   // ← NEW
    val deletedIncomeUuids: List<String>? = null      // ← NEW
)
```

### 14d. Update SyncRepository.kt

In `sync()`, collect and send pending deletions BEFORE collecting normal data:

```kotlin
suspend fun sync(): Result<SyncResponse> = withContext(Dispatchers.IO) {
    try {
        // ... existing base URL + apiService setup ...

        // 0. Collect pending deletions BEFORE other data
        val deletedExpenseUuids = pendingDeletionDao.getAllUuids("expense")
        val deletedCategoryUuids = pendingDeletionDao.getAllUuids("category")
        val deletedIncomeUuids = pendingDeletionDao.getAllUuids("income")

        // 1. Collect local data (same as before)
        val localCategories = categoryDao.getAllCategoriesOnce()
        val localExpenses = transactionDao.getTransactionsByType("EXPENSE")
        val localIncomes = incomeDao.getAllIncomeEntriesOnce()

        // 2. Map to API format (same as before)
        // ... existing mapping code ...

        // 3. Push to server — now includes deleted UUIDs
        val request = SyncRequest(
            categories = categories,
            expenses = expenses,
            income = income,
            deletedExpenseUuids = deletedExpenseUuids,
            deletedCategoryUuids = deletedCategoryUuids,
            deletedIncomeUuids = deletedIncomeUuids
        )
        val response = apiService!!.sync(request)

        if (response.isSuccessful) {
            // 4. Clear pending deletions (they're now synced)
            pendingDeletionDao.clearAll()
            // ... rest of success handling ...
        }
    }
}
```

### 14e. Call pending deletion when user deletes on mobile

In your delete handlers (wherever the user deletes an expense or category), add:

```kotlin
// Before deleting locally, record the UUID
pendingDeletionDao.insert(PendingDeletionEntity(
    entityType = "expense",   // or "category", "income"
    uuid = item.uuid
))

// Then delete locally
transactionDao.delete(expense)  // or categoryDao.delete(category)
```

### 14f. Update AppDatabase.kt

Add `PendingDeletionEntity` to the entities list:

```kotlin
@Database(
    entities = [
        CategoryEntity::class,
        TransactionEntity::class,
        IncomeEntity::class,
        PendingDeletionEntity::class,   // ← NEW
    ],
    version = 6,   // bump from 5
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun categoryDao(): CategoryDao
    abstract fun transactionDao(): TransactionDao
    abstract fun incomeDao(): IncomeDao
    abstract fun pendingDeletionDao(): PendingDeletionDao  // ← NEW
}
```

Use `fallbackToDestructiveMigration()` — the existing data will be re-synced from web after version bump.

### 14g. Update DI Module

```kotlin
@Provides
@Singleton
fun providePendingDeletionDao(db: AppDatabase): PendingDeletionDao =
    db.pendingDeletionDao()
```

---

## Files to Create/Modify (Updated)

| # | File | Action |
|---|---|---|
| ... | (same as previous table) | ... |
| 19 | `data/model/entity/PendingDeletionEntity.kt` | **New** |
| 20 | `data/database/PendingDeletionDao.kt` | **New** |
| 21 | `data/network/ApiService.kt` | Modify — add deleted UUID arrays to SyncRequest |
| 22 | `data/network/SyncRepository.kt` | Modify — collect and send pending deletions |
| 23 | `data/database/AppDatabase.kt` | Modify — add PendingDeletionEntity + DAO, bump version |

**Total: 12 new files, 8 modified, 2 deleted.**
