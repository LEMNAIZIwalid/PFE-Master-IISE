package com.example.pos.Views;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class ArchivesActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_archives);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }
}
