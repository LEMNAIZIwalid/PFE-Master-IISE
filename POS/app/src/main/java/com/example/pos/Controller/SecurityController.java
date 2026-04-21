package com.example.pos.Controller;

import android.content.Context;
import android.content.SharedPreferences;
import com.example.pos.Model.PinModel;

public class SecurityController {
    private static final String KEY_AUTO_LOCK = "auto_lock";

    public boolean validateCurrentPin(Context context, String input) {
        SharedPreferences prefs = context.getSharedPreferences(PinModel.PREFS_NAME, Context.MODE_PRIVATE);
        String currentPin = prefs.getString(PinModel.KEY_PIN, PinModel.DEFAULT_PIN);
        return currentPin.equals(input);
    }

    public String saveNewPin(Context context, String currentPin, String newPin, String confirmPin) {
        if (!validateCurrentPin(context, currentPin)) return "Incorrect current PIN";
        if (newPin.length() != 4) return "New PIN must be 4 digits";
        if (!newPin.equals(confirmPin)) return "PINs do not match";
        context.getSharedPreferences(PinModel.PREFS_NAME, Context.MODE_PRIVATE)
               .edit().putString(PinModel.KEY_PIN, newPin).apply();
        return null; // null = success
    }

    public boolean isAutoLockEnabled(Context context) {
        return context.getSharedPreferences(PinModel.PREFS_NAME, Context.MODE_PRIVATE)
                      .getBoolean(KEY_AUTO_LOCK, false);
    }

    public void setAutoLock(Context context, boolean enabled) {
        context.getSharedPreferences(PinModel.PREFS_NAME, Context.MODE_PRIVATE)
               .edit().putBoolean(KEY_AUTO_LOCK, enabled).apply();
    }
}
