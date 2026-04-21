package com.example.pos.Controller;

import android.content.Context;
import com.example.pos.Model.ProfileModel;

public class ProfileController {
    private ProfileModel model;

    public ProfileController(Context context) {
        this.model = new ProfileModel(context);
    }

    public String getFormattedPosId() {
        return "POS-ID : " + model.getPosId();
    }

    public String getPosName() {
        return model.getPosName();
    }

    public String getRole() {
        return model.getRole();
    }

    public void updateProfile(Context context, String newName, String newRole) {
        model.setPosName(newName);
        model.setRole(newRole);
        model.save(context);
    }
}
