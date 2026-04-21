package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class SaleActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sale);

        findViewById(R.id.btnSaleBack).setOnClickListener(v -> finish());

        findViewById(R.id.btnScan).setOnClickListener(v ->
                startActivity(new Intent(this, ScanActivity.class)));

        findViewById(R.id.btnManual).setOnClickListener(v ->
                startActivity(new Intent(this, ManualActivity.class)));

        findViewById(R.id.btnRefund).setOnClickListener(v ->
                startActivity(new Intent(this, RefundActivity.class)));

        findViewById(R.id.btnArchives).setOnClickListener(v ->
                startActivity(new Intent(this, ArchivesActivity.class)));
    }
}
