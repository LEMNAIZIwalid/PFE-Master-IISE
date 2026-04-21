package com.example.pos.Controller;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.BatteryManager;
import android.os.Environment;
import android.os.StatFs;

public class SystemController {
    private static final String PREFS_NAME = "POS_System_Prefs";
    private static final String KEY_SOUNDS = "sounds_enabled";

    public String getAppVersion(Context context) {
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return "v" + info.versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "v1.0.0";
        }
    }

    public int getBatteryLevel(Context context) {
        Intent intent = context.registerReceiver(null,
                new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (intent == null) return -1;
        int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        if (level == -1 || scale == -1) return -1;
        return (int) ((level / (float) scale) * 100);
    }

    public String getAvailableStorage() {
        StatFs stat = new StatFs(Environment.getExternalStorageDirectory().getPath());
        long bytesAvailable = stat.getBlockSizeLong() * stat.getAvailableBlocksLong();
        long mb = bytesAvailable / (1024 * 1024);
        if (mb > 1024) return (mb / 1024) + " GB libre";
        return mb + " MB libre";
    }

    public boolean isSoundsEnabled(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_SOUNDS, true);
    }

    public void setSoundsEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_SOUNDS, enabled).apply();
    }

    public void factoryReset(Context context) {
        String[] prefsFiles = {"POS_Security_Prefs", "POS_Display_Prefs", "POS_SaleOpts_Prefs", "POS_System_Prefs", "POS_Profile_Prefs"};
        for (String name : prefsFiles) {
            context.getSharedPreferences(name, Context.MODE_PRIVATE).edit().clear().apply();
        }
    }
}
