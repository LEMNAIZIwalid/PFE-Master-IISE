package com.example.pos.Views;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.pos.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class HistoryActivity extends AppCompatActivity {

    private String cardId;
    private String cardPan;

    private LinearLayout layoutLoading;
    private LinearLayout layoutEmpty;
    private LinearLayout layoutError;
    private RecyclerView recyclerHistory;
    private TextView tvEventCount;
    private TextView tvErrorMessage;

    private ExecutorService executorService = Executors.newSingleThreadExecutor();
    private Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_history);

        // Get extras
        cardId = getIntent().getStringExtra("CARD_ID");
        if (cardId == null || cardId.trim().isEmpty()) {
            cardId = "bankclient"; // fallback
        }
        cardPan = getIntent().getStringExtra("CARD_PAN");
        if (cardPan == null || cardPan.trim().isEmpty()) {
            cardPan = "Card Activity";
        }

        // Setup Header & Context
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        TextView tvHistoryCardId = findViewById(R.id.tvHistoryCardId);
        tvHistoryCardId.setText(cardPan);

        tvEventCount = findViewById(R.id.tvEventCount);

        // Bind States
        layoutLoading = findViewById(R.id.layoutLoading);
        layoutEmpty   = findViewById(R.id.layoutEmpty);
        layoutError   = findViewById(R.id.layoutError);
        tvErrorMessage= findViewById(R.id.tvErrorMessage);
        recyclerHistory = findViewById(R.id.recyclerHistory);

        Button btnRetry = findViewById(R.id.btnRetry);
        btnRetry.setOnClickListener(v -> loadHistoryData());

        // Setup RecyclerView
        recyclerHistory.setLayoutManager(new LinearLayoutManager(this));

        // Start Fetch
        loadHistoryData();
    }

    private void showState(View visibleView) {
        layoutLoading.setVisibility(View.GONE);
        layoutEmpty.setVisibility(View.GONE);
        layoutError.setVisibility(View.GONE);
        recyclerHistory.setVisibility(View.GONE);
        visibleView.setVisibility(View.VISIBLE);
    }

    private void loadHistoryData() {
        showState(layoutLoading);

        executorService.execute(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL("http://10.0.2.2:5001/api/mobile/history/" + cardId);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                int code = conn.getResponseCode();
                if (code == 200) {
                    InputStream is = conn.getInputStream();
                    BufferedReader br = new BufferedReader(new InputStreamReader(is, "utf-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        sb.append(line.trim());
                    }
                    JSONArray jsonArray = new JSONArray(sb.toString());

                    // Parse and group
                    List<HistoryAdapter.HistoryItem> items = parseAndGroupHistory(jsonArray);

                    mainHandler.post(() -> {
                        if (items.isEmpty()) {
                            showState(layoutEmpty);
                            tvEventCount.setText("0 events");
                        } else {
                            HistoryAdapter adapter = new HistoryAdapter(this, items);
                            recyclerHistory.setAdapter(adapter);
                            showState(recyclerHistory);
                            // Count actual entries (not headers)
                            int events = 0;
                            for (HistoryAdapter.HistoryItem item : items) {
                                if (item.viewType == 1) events++; // TYPE_ENTRY = 1
                            }
                            tvEventCount.setText(events + " events");
                        }
                    });

                } else {
                    mainHandler.post(() -> {
                        tvErrorMessage.setText("Server returned error code: " + code);
                        showState(layoutError);
                    });
                }

            } catch (Exception e) {
                e.printStackTrace();
                mainHandler.post(() -> {
                    tvErrorMessage.setText(e.getMessage());
                    showState(layoutError);
                });
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    private List<HistoryAdapter.HistoryItem> parseAndGroupHistory(JSONArray jsonArray) throws Exception {
        List<HistoryAdapter.HistoryItem> result = new ArrayList<>();
        String currentDateGroup = "";

        for (int i = 0; i < jsonArray.length(); i++) {
            JSONObject obj = jsonArray.getJSONObject(i);

            String date        = obj.optString("date", "Unknown Date");
            String time        = obj.optString("time", "");
            String operation   = obj.optString("operation", "Unknown");
            String sourceLabel = obj.optString("source_label", "Unknown Admin");
            String iconType    = obj.optString("icon_type", "update");
            String title       = obj.optString("title", "Card Updated");

            // Check if we need a new date header
            if (!date.equals(currentDateGroup)) {
                // To keep it simple, we just use the date string directly.
                // Could be enhanced to say "Today" or "Yesterday" by parsing the timestamp.
                result.add(new HistoryAdapter.HistoryItem(date));
                currentDateGroup = date;
            }

            // Parse changes
            List<HistoryAdapter.ChangeDetail> changes = new ArrayList<>();
            JSONArray changesArr = obj.optJSONArray("changes");
            if (changesArr != null) {
                for (int j = 0; j < changesArr.length(); j++) {
                    JSONObject c = changesArr.getJSONObject(j);
                    changes.add(new HistoryAdapter.ChangeDetail(
                            c.optString("field", ""),
                            c.optString("old_value", ""),
                            c.optString("new_value", "")
                    ));
                }
            }

            // Add entry
            result.add(new HistoryAdapter.HistoryItem(title, time, sourceLabel, operation, iconType, changes));
        }

        return result;
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executorService.shutdownNow();
    }
}
