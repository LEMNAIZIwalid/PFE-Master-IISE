package com.example.pos.Controller;

import android.content.Context;
import android.content.SharedPreferences;

public class DisplayController {
    private static final String PREFS_NAME = "POS_Display_Prefs";
    private static final String KEY_BRIGHTNESS = "brightness";
    private static final String KEY_DARK_MODE = "dark_mode";
    private static final String KEY_SLEEP = "sleep_index";

    public int getBrightness(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getInt(KEY_BRIGHTNESS, 128);
    }

    public void saveBrightness(Context context, int value) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putInt(KEY_BRIGHTNESS, value).apply();
    }

    public boolean isDarkMode(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_DARK_MODE, false);
    }

    public void setDarkMode(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_DARK_MODE, enabled).apply();
    }

    public int getSleepIndex(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getInt(KEY_SLEEP, 0);
    }

    public void setSleepIndex(Context context, int index) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putInt(KEY_SLEEP, index).apply();
    }

    public void saveAll(Context context, int brightness, boolean darkMode, int sleepIndex) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putInt(KEY_BRIGHTNESS, brightness);
        editor.putBoolean(KEY_DARK_MODE, darkMode);
        editor.putInt(KEY_SLEEP, sleepIndex);
        editor.apply();
    }
}
