package com.tracker.model;

public enum Stage {
    WISHLIST("Wishlist"),
    APPLIED("Applied"),
    TEST("OA / Test"),
    INTERVIEW("Interview"),
    OFFER("Offer"),
    REJECTED("Rejected");

    private final String label;

    Stage(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
