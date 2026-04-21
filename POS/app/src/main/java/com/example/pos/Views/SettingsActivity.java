package com.example.pos.Views;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class SettingsActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        // Back button
        findViewById(R.id.btnSettingsBack).setOnClickListener(v -> finish());

        // Grid navigation
        findViewById(R.id.btnNetwork).setOnClickListener(v ->
                startActivity(new Intent(this, NetworkActivity.class)));

        findViewById(R.id.btnDisplay).setOnClickListener(v ->
                startActivity(new Intent(this, DisplayActivity.class)));

        findViewById(R.id.btnSystem).setOnClickListener(v ->
                startActivity(new Intent(this, SystemActivity.class)));

        findViewById(R.id.btnSecurity).setOnClickListener(v ->
                startActivity(new Intent(this, SecurityActivity.class)));

        findViewById(R.id.btnSaleOpts).setOnClickListener(v ->
                startActivity(new Intent(this, SaleOptsActivity.class)));

        findViewById(R.id.btnAbout).setOnClickListener(v ->
                startActivity(new Intent(this, AboutActivity.class)));
    }
}
