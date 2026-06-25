import { FlatList, Pressable, Text, View } from "react-native";
import { styles } from "../../styles";
import { useDues } from "../../context/domainHooks";
import { formatAmount, formatDateTime } from "./format";

// "Ledger" tab: recent income/expense transactions, with a leadership-only
// "＋ New" entry point that opens the record-transaction sheet.
export function LedgerTab({ onAddTransaction }: { onAddTransaction: () => void }) {
  const { ledgerEntries, canManageDues } = useDues();

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Ledger</Text>
          <Text style={styles.memberMeta}>
            Income and expenses outside of dues.
          </Text>
        </View>
        {canManageDues ? (
          <Pressable
            style={styles.inviteLink}
            onPress={onAddTransaction}
            accessibilityRole="button"
            accessibilityLabel="New transaction"
          >
            <Text style={styles.inviteLinkText}>＋ New</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.subTitle}>Recent transactions</Text>
      {ledgerEntries.length === 0 ? (
        <Text style={styles.memberMeta}>No transactions recorded yet.</Text>
      ) : (
        <FlatList
          data={ledgerEntries}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={styles.dueRowText}>
                <Text style={styles.memberName}>{item.category}</Text>
                <Text style={styles.memberMeta}>
                  {item.paymentMethod}
                  {item.memberName
                    ? ` \u00b7 ${item.memberName}`
                    : item.description
                      ? ` \u00b7 ${item.description}`
                      : ""}
                </Text>
                <Text style={styles.metaText}>
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <Text
                style={item.type === "income" ? styles.paid : styles.unpaid}
              >
                {item.type === "income" ? "+" : "-"}
                {formatAmount(item.amount)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
