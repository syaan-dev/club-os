import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { styles, colors } from "../styles";

type DateFieldMode = "date" | "datetime";

// Reusable tap-to-open date / date-and-time field. Replaces the free-text
// date inputs across the app with the native picker. The committed value is a
// plain string so existing payloads/validation keep working:
//   mode "date"     -> "YYYY-MM-DD"
//   mode "datetime" -> full ISO timestamp
export function DateField({
  value,
  onChange,
  mode = "date",
  placeholder = "Select a date",
  accessibilityLabel,
  clearable = false,
}: {
  value: string;
  onChange: (next: string) => void;
  mode?: DateFieldMode;
  placeholder?: string;
  accessibilityLabel: string;
  clearable?: boolean;
}) {
  // iOS renders the picker inline inside a modal sheet; this controls it.
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(value));

  const commit = (next: Date) => onChange(serialize(next, mode));

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: toDate(value),
      mode: "date",
      onChange: (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type !== "set" || !picked) {
          return;
        }
        if (mode === "datetime") {
          DateTimePickerAndroid.open({
            value: picked,
            mode: "time",
            is24Hour: false,
            onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
              if (timeEvent.type !== "set" || !time) {
                return;
              }
              commit(time);
            },
          });
        } else {
          commit(picked);
        }
      },
    });
  };

  const open = () => {
    if (Platform.OS === "android") {
      openAndroid();
    } else {
      setDraft(toDate(value));
      setIosOpen(true);
    }
  };

  return (
    <View>
      <Pressable
        style={styles.dateField}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value || "" }}
      >
        <Text
          style={value ? styles.dateFieldText : styles.dateFieldPlaceholder}
        >
          {value ? display(value, mode) : placeholder}
        </Text>
        {clearable && value ? (
          <Pressable
            onPress={() => onChange("")}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${accessibilityLabel}`}
            hitSlop={8}
          >
            <Text style={styles.dateFieldClear}>{"\u00d7"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.dateFieldIcon}>{"\uD83D\uDCC5"}</Text>
        )}
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal
          visible={iosOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIosOpen(false)}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setIosOpen(false)}
          >
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <View style={styles.dateFieldPickerActions}>
                <Pressable
                  onPress={() => setIosOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel date selection"
                >
                  <Text style={styles.dateFieldCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    commit(draft);
                    setIosOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm date selection"
                >
                  <Text style={styles.dateFieldDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                themeVariant="light"
                onChange={(_event: DateTimePickerEvent, picked?: Date) => {
                  if (picked) {
                    setDraft(picked);
                  }
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

// Parse a stored value into a Date for the picker, defaulting to "now".
function toDate(value: string): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

// Serialize the picked Date back into the string shape the rest of the app
// expects for each mode.
function serialize(date: Date, mode: DateFieldMode): string {
  if (mode === "datetime") {
    return date.toISOString();
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Human-friendly label shown in the field once a value is set.
function display(value: string, mode: DateFieldMode): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  if (mode === "datetime") {
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
