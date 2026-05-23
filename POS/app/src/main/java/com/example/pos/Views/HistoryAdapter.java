package com.example.pos.Views;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.example.pos.R;

import java.util.List;

public class HistoryAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_DATE_HEADER = 0;
    private static final int TYPE_ENTRY       = 1;

    // ── Data model ────────────────────────────────────────────────────────────

    public static class HistoryItem {
        // Common
        public int    viewType;   // TYPE_DATE_HEADER or TYPE_ENTRY

        // Header fields
        public String dateLabel;  // "Today", "Yesterday", "22 May 2026"

        // Entry fields
        public String title;
        public String time;
        public String sourceLabel;
        public String operation;
        public String iconType;
        public List<ChangeDetail> changes;

        // ── Constructor: date header
        public HistoryItem(String dateLabel) {
            this.viewType  = TYPE_DATE_HEADER;
            this.dateLabel = dateLabel;
        }

        // ── Constructor: entry
        public HistoryItem(String title, String time, String sourceLabel,
                           String operation, String iconType,
                           List<ChangeDetail> changes) {
            this.viewType     = TYPE_ENTRY;
            this.title        = title;
            this.time         = time;
            this.sourceLabel  = sourceLabel;
            this.operation    = operation;
            this.iconType     = iconType;
            this.changes      = changes;
        }
    }

    public static class ChangeDetail {
        public String field;
        public String oldValue;
        public String newValue;

        public ChangeDetail(String field, String oldValue, String newValue) {
            this.field    = field;
            this.oldValue = oldValue;
            this.newValue = newValue;
        }
    }

    // ── ViewHolders ───────────────────────────────────────────────────────────

    static class DateHeaderViewHolder extends RecyclerView.ViewHolder {
        TextView tvDateHeader;
        DateHeaderViewHolder(View v) {
            super(v);
            tvDateHeader = v.findViewById(R.id.tvDateHeader);
        }
    }

    static class EntryViewHolder extends RecyclerView.ViewHolder {
        CardView   cardIcon;
        ImageView  ivIcon;
        TextView   tvEntryTitle;
        TextView   tvEntryTime;
        TextView   tvSourceBadge;
        TextView   tvOperation;
        LinearLayout layoutChanges;
        View       viewLineTop;
        View       viewLineBottom;

        EntryViewHolder(View v) {
            super(v);
            cardIcon      = v.findViewById(R.id.cardIcon);
            ivIcon        = v.findViewById(R.id.ivIcon);
            tvEntryTitle  = v.findViewById(R.id.tvEntryTitle);
            tvEntryTime   = v.findViewById(R.id.tvEntryTime);
            tvSourceBadge = v.findViewById(R.id.tvSourceBadge);
            tvOperation   = v.findViewById(R.id.tvOperation);
            layoutChanges = v.findViewById(R.id.layoutChanges);
            viewLineTop   = v.findViewById(R.id.viewLineTop);
            viewLineBottom= v.findViewById(R.id.viewLineBottom);
        }
    }

    // ── Adapter ───────────────────────────────────────────────────────────────

    private final List<HistoryItem> items;
    private final Context           ctx;

    public HistoryAdapter(Context ctx, List<HistoryItem> items) {
        this.ctx   = ctx;
        this.items = items;
    }

    @Override public int getItemViewType(int position) { return items.get(position).viewType; }
    @Override public int getItemCount()                { return items.size(); }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inf = LayoutInflater.from(ctx);
        if (viewType == TYPE_DATE_HEADER) {
            View v = inf.inflate(R.layout.item_history_date_header, parent, false);
            return new DateHeaderViewHolder(v);
        } else {
            View v = inf.inflate(R.layout.item_history_entry, parent, false);
            return new EntryViewHolder(v);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        HistoryItem item = items.get(position);

        if (holder instanceof DateHeaderViewHolder) {
            ((DateHeaderViewHolder) holder).tvDateHeader.setText(item.dateLabel);
            return;
        }

        // ── Entry ViewHolder ─────────────────────────────────────────────────
        EntryViewHolder vh = (EntryViewHolder) holder;

        // Title & time
        vh.tvEntryTitle.setText(item.title);
        vh.tvEntryTime.setText(item.time);
        vh.tvOperation.setText(item.operation);

        // Hide top line for first entry after each header
        boolean isFirstEntry = (position == 0 || items.get(position - 1).viewType == TYPE_DATE_HEADER);
        vh.viewLineTop.setVisibility(isFirstEntry ? View.INVISIBLE : View.VISIBLE);

        // Hide bottom line for last item
        boolean isLast = (position == items.size() - 1);
        vh.viewLineBottom.setVisibility(isLast ? View.INVISIBLE : View.VISIBLE);

        // Icon & card tint based on iconType
        int iconRes    = iconResFor(item.iconType);
        int iconColor  = iconColorFor(item.iconType);

        vh.ivIcon.setImageResource(iconRes);
        vh.cardIcon.setCardBackgroundColor(ContextCompat.getColor(ctx, iconColor));

        // Source badge
        boolean isPwc = !item.sourceLabel.toLowerCase().contains("external");
        vh.tvSourceBadge.setText(item.sourceLabel);
        if (isPwc) {
            vh.tvSourceBadge.setBackgroundResource(R.drawable.badge_pwc);
            vh.tvSourceBadge.setTextColor(ContextCompat.getColor(ctx, R.color.badge_pwc_text));
        } else {
            vh.tvSourceBadge.setBackgroundResource(R.drawable.badge_external);
            vh.tvSourceBadge.setTextColor(ContextCompat.getColor(ctx, R.color.badge_ext_text));
        }

        // Populate change rows
        vh.layoutChanges.removeAllViews();
        if (item.changes != null) {
            for (ChangeDetail cd : item.changes) {
                View row = buildChangeRow(cd);
                vh.layoutChanges.addView(row);
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private View buildChangeRow(ChangeDetail cd) {
        LinearLayout row = new LinearLayout(ctx);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);

        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        rowParams.bottomMargin = dpToPx(5);
        row.setLayoutParams(rowParams);

        // Field label
        TextView tvField = new TextView(ctx);
        tvField.setTextSize(12);
        tvField.setTextColor(ContextCompat.getColor(ctx, R.color.text_secondary));
        tvField.setText(cd.field + ":");
        LinearLayout.LayoutParams fieldParams = new LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1.2f);
        tvField.setLayoutParams(fieldParams);
        row.addView(tvField);

        // Old value (show only if not empty)
        if (cd.oldValue != null && !cd.oldValue.isEmpty()) {
            TextView tvOld = new TextView(ctx);
            tvOld.setTextSize(12);
            tvOld.setTextColor(ContextCompat.getColor(ctx, R.color.danger));
            tvOld.setText(cd.oldValue);
            tvOld.setPaintFlags(tvOld.getPaintFlags() | android.graphics.Paint.STRIKE_THRU_TEXT_FLAG);
            LinearLayout.LayoutParams oldParams = new LinearLayout.LayoutParams(0,
                    LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            tvOld.setLayoutParams(oldParams);
            row.addView(tvOld);

            // Arrow
            TextView tvArrow = new TextView(ctx);
            tvArrow.setTextSize(12);
            tvArrow.setTextColor(ContextCompat.getColor(ctx, R.color.change_arrow));
            tvArrow.setText("  →  ");
            row.addView(tvArrow);
        }

        // New value
        TextView tvNew = new TextView(ctx);
        tvNew.setTextSize(12);
        tvNew.setTextColor(ContextCompat.getColor(ctx, R.color.success));
        tvNew.setText(cd.newValue);
        LinearLayout.LayoutParams newParams = new LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvNew.setLayoutParams(newParams);
        row.addView(tvNew);

        return row;
    }

    private int iconResFor(String iconType) {
        if (iconType == null) return R.drawable.ic_history_update;
        switch (iconType) {
            case "create":  return R.drawable.ic_history_create;
            case "delete":  return R.drawable.ic_history_delete;
            case "status":  return R.drawable.ic_history_status;
            case "balance": return R.drawable.ic_history_balance;
            case "limits":  return R.drawable.ic_history_limits;
            case "profile": return R.drawable.ic_history_update;
            default:        return R.drawable.ic_history_update;
        }
    }

    private int iconColorFor(String iconType) {
        if (iconType == null) return R.color.history_update;
        switch (iconType) {
            case "create":  return R.color.history_create;
            case "delete":  return R.color.history_delete;
            case "status":  return R.color.history_status;
            case "balance": return R.color.history_update;
            case "limits":  return R.color.history_limits;
            case "profile": return R.color.history_profile;
            default:        return R.color.history_update;
        }
    }

    private int dpToPx(int dp) {
        float density = ctx.getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }
}
