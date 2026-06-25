import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "../../styles";
import type { Announcement } from "../../types";
import { formatDateTime } from "./format";

// Email-style reader for a single notice. The parent owns marking-as-read so
// this stays a pure presentation sheet driven by the `notice` prop.
export function NoticeDetailModal({
  notice,
  onClose,
}: {
  notice: Announcement | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={notice !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          {notice ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text style={styles.noticeDetailSubject}>{notice.title}</Text>
              <Text style={styles.noticeDetailMeta}>
                {notice.createdByName} {"\u00b7"}{" "}
                {formatDateTime(notice.createdAt)}
              </Text>
              <View style={styles.separator} />
              <Text style={styles.noticeDetailBody}>{notice.body}</Text>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
