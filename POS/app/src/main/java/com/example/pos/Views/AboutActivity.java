package com.example.pos.Views;

import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.pos.R;

public class AboutActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about);

        // Display app version
        String version = "v1.0.0";
        try {
            version = "v" + getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException ignored) {}
        ((TextView) findViewById(R.id.tvAppVersion)).setText(version);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
    }
}
