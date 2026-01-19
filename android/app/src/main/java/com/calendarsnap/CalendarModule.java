package com.calendarsnap;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

public class CalendarModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public CalendarModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CalendarModule";
    }

    @ReactMethod
    public void getCalendars(Promise promise) {
        try {
            ContentResolver cr = reactContext.getContentResolver();
            Uri uri = CalendarContract.Calendars.CONTENT_URI;

            String[] projection = new String[]{
                    CalendarContract.Calendars._ID,
                    CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                    CalendarContract.Calendars.ACCOUNT_NAME,
                    CalendarContract.Calendars.ACCOUNT_TYPE,
                    CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL
            };

            // Only get calendars with write access
            String selection = CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL + " >= ?";
            String[] selectionArgs = new String[]{String.valueOf(CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR)};

            Cursor cursor = cr.query(uri, projection, selection, selectionArgs, null);

            WritableArray calendars = Arguments.createArray();

            if (cursor != null) {
                while (cursor.moveToNext()) {
                    WritableMap calendar = Arguments.createMap();
                    calendar.putString("id", cursor.getString(0));
                    calendar.putString("name", cursor.getString(1));
                    calendar.putString("accountName", cursor.getString(2));
                    calendar.putString("accountType", cursor.getString(3));
                    calendar.putInt("accessLevel", cursor.getInt(4));
                    calendars.pushMap(calendar);
                }
                cursor.close();
            }

            promise.resolve(calendars);
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Calendar permission not granted", e);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get calendars: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void addEvent(String calendarId, ReadableMap eventData, Promise promise) {
        try {
            ContentResolver cr = reactContext.getContentResolver();
            ContentValues values = new ContentValues();

            values.put(CalendarContract.Events.CALENDAR_ID, Long.parseLong(calendarId));
            values.put(CalendarContract.Events.TITLE, eventData.getString("title"));

            // Parse date and time
            String startDate = eventData.getString("startDate");
            String startTime = eventData.hasKey("startTime") && !eventData.isNull("startTime")
                    ? eventData.getString("startTime") : "00:00";
            String endTime = eventData.hasKey("endTime") && !eventData.isNull("endTime")
                    ? eventData.getString("endTime") : startTime;

            long startMillis = parseDateTime(startDate, startTime);
            long endMillis = parseDateTime(startDate, endTime);

            // If end time is before start time, assume it's the next day
            if (endMillis <= startMillis) {
                endMillis += 24 * 60 * 60 * 1000; // Add 24 hours
            }

            values.put(CalendarContract.Events.DTSTART, startMillis);
            values.put(CalendarContract.Events.DTEND, endMillis);
            values.put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());

            if (eventData.hasKey("location") && !eventData.isNull("location")) {
                values.put(CalendarContract.Events.EVENT_LOCATION, eventData.getString("location"));
            }

            if (eventData.hasKey("description") && !eventData.isNull("description")) {
                values.put(CalendarContract.Events.DESCRIPTION, eventData.getString("description"));
            }

            Uri eventUri = cr.insert(CalendarContract.Events.CONTENT_URI, values);

            if (eventUri != null) {
                String eventId = eventUri.getLastPathSegment();
                promise.resolve(eventId);
            } else {
                promise.reject("ERROR", "Failed to insert event");
            }
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Calendar permission not granted", e);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to add event: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void addEvents(String calendarId, ReadableArray events, Promise promise) {
        try {
            int successCount = 0;
            int failCount = 0;

            for (int i = 0; i < events.size(); i++) {
                ReadableMap eventData = events.getMap(i);
                try {
                    ContentResolver cr = reactContext.getContentResolver();
                    ContentValues values = new ContentValues();

                    values.put(CalendarContract.Events.CALENDAR_ID, Long.parseLong(calendarId));
                    values.put(CalendarContract.Events.TITLE, eventData.getString("title"));

                    String startDate = eventData.getString("startDate");
                    String startTime = eventData.hasKey("startTime") && !eventData.isNull("startTime")
                            ? eventData.getString("startTime") : "00:00";
                    String endTime = eventData.hasKey("endTime") && !eventData.isNull("endTime")
                            ? eventData.getString("endTime") : startTime;

                    long startMillis = parseDateTime(startDate, startTime);
                    long endMillis = parseDateTime(startDate, endTime);

                    if (endMillis <= startMillis) {
                        endMillis += 24 * 60 * 60 * 1000;
                    }

                    values.put(CalendarContract.Events.DTSTART, startMillis);
                    values.put(CalendarContract.Events.DTEND, endMillis);
                    values.put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());

                    if (eventData.hasKey("location") && !eventData.isNull("location")) {
                        values.put(CalendarContract.Events.EVENT_LOCATION, eventData.getString("location"));
                    }

                    if (eventData.hasKey("description") && !eventData.isNull("description")) {
                        values.put(CalendarContract.Events.DESCRIPTION, eventData.getString("description"));
                    }

                    Uri eventUri = cr.insert(CalendarContract.Events.CONTENT_URI, values);
                    if (eventUri != null) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (Exception e) {
                    failCount++;
                }
            }

            WritableMap result = Arguments.createMap();
            result.putInt("success", successCount);
            result.putInt("failed", failCount);
            promise.resolve(result);
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Calendar permission not granted", e);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to add events: " + e.getMessage(), e);
        }
    }

    private long parseDateTime(String date, String time) throws Exception {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US);
        sdf.setTimeZone(TimeZone.getDefault());
        return sdf.parse(date + " " + time).getTime();
    }
}
