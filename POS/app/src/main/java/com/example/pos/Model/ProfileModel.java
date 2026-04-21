package com.example.pos.Model;

import android.content.Context;
import android.content.SharedPreferences;

public class ProfileModel {
    private static final String PREFS_NAME = "POS_Profile_Prefs";
    private static final String KEY_NAME = "pos_name";
    private static final String KEY_ROLE = "pos_role";

    private final String posId = "1001954";
    private String posName;
    private String role;

    public ProfileModel(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.posName = prefs.getString(KEY_NAME, "Lemnaizi_POS");
        this.role = prefs.getString(KEY_ROLE, "commercant");
    }

    public String getPosId() {
        return posId;
    }

    public String getPosName() {
        return posName;
    }

    public void setPosName(String posName) {
        this.posName = posName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void save(Context context) {
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putString(KEY_NAME, posName);
        editor.putString(KEY_ROLE, role);
        editor.apply();
    }
}
