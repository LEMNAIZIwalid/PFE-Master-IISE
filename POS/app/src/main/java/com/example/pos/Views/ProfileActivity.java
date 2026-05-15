package com.example.pos.Views;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class ProfileActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }
}
