package com.example.pos.Controller;

import com.example.pos.Model.WelcomeModel;

public class WelcomeController {
    private WelcomeModel model;

    public WelcomeController() {
        this.model = new WelcomeModel();
    }

    public String getWelcomeMessage() {
        return model.getWelcomeMessage();
    }
}
