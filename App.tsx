import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as XLSX from 'xlsx';

type LaporanRow = {
  tanggal: string;
  produk: string;
  qty: number;
  harga: number;
  total: number;
};

const DATA_LAPORAN: LaporanRow[] = [
  { tanggal: '2026-06-01', produk: 'Buku Tulis', qty: 12, harga: 8500, total: 102000 },
  { tanggal: '2026-06-01', produk: 'Pulpen', qty: 25, harga: 3500, total: 87500 },
  { tanggal: '2026-06-02', produk: 'Penghapus', qty: 18, harga: 2000, total: 36000 },
  { tanggal: '2026-06-02', produk: 'Penggaris', qty: 9, harga: 4500, total: 40500 },
];

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function App() {
  const { width } = useWindowDimensions();
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalKeseluruhan = useMemo(
    () => DATA_LAPORAN.reduce((sum, item) => sum + item.total, 0),
    []
  );

  const cardStyle = useMemo(
    () => [styles.card, { width: Math.min(width - 32, 540) }],
    [width]
  );

  const generateExcel = async () => {
    if (!FileSystem.documentDirectory) {
      Alert.alert('Gagal', 'Penyimpanan lokal tidak tersedia di perangkat ini.');
      return;
    }

    try {
      setIsGenerating(true);

      const worksheet = XLSX.utils.json_to_sheet(DATA_LAPORAN);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');

      const base64 = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });

      const filename = `laporan-penjualan-${Date.now()}.xlsx`;
      const uri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setFileUri(uri);
      Alert.alert('Berhasil', 'File Excel berhasil dibuat di penyimpanan lokal.');
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat membuat file Excel.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadExcel = async () => {
    if (!fileUri) {
      Alert.alert('Info', 'Silakan generate laporan terlebih dahulu.');
      return;
    }

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('File Tersimpan', `File tersimpan di:\n${fileUri}`);
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: EXCEL_MIME,
      dialogTitle: 'Download/Bagikan Laporan Excel',
      UTI: EXCEL_MIME,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={cardStyle}>
          <Text style={styles.title}>Generate Laporan Excel</Text>
          <Text style={styles.subtitle}>
            Aplikasi offline untuk membuat dan download laporan Excel dari data lokal.
          </Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Penjualan</Text>
            <Text style={styles.summaryValue}>{formatRupiah(totalKeseluruhan)}</Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell, styles.tanggal]}>Tanggal</Text>
            <Text style={[styles.cell, styles.headerCell, styles.produk]}>Produk</Text>
            <Text style={[styles.cell, styles.headerCell, styles.total]}>Total</Text>
          </View>

          {DATA_LAPORAN.map((item) => (
            <View key={`${item.tanggal}-${item.produk}`} style={styles.tableRow}>
              <Text style={[styles.cell, styles.tanggal]}>{item.tanggal}</Text>
              <Text style={[styles.cell, styles.produk]}>{item.produk}</Text>
              <Text style={[styles.cell, styles.total]}>{formatRupiah(item.total)}</Text>
            </View>
          ))}

          <Pressable
            style={[styles.button, styles.primaryButton, isGenerating && styles.disabledButton]}
            onPress={generateExcel}
            disabled={isGenerating}
          >
            <Text style={styles.buttonText}>
              {isGenerating ? 'Membuat Excel...' : 'Generate Excel'}
            </Text>
          </Pressable>

          <Pressable style={[styles.button, styles.secondaryButton]} onPress={downloadExcel}>
            <Text style={styles.buttonText}>Download / Bagikan Excel</Text>
          </Pressable>

          <Text style={styles.pathText} numberOfLines={2}>
            {fileUri ? `Lokasi file: ${fileUri}` : 'Belum ada file yang dibuat.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#102542',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  summaryBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eef4ff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#334155',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe2ea',
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    paddingVertical: 8,
  },
  cell: {
    fontSize: 13,
    color: '#0f172a',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tanggal: {
    flex: 1.25,
  },
  produk: {
    flex: 1.5,
  },
  total: {
    flex: 1,
    textAlign: 'right',
  },
  button: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#0f766e',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pathText: {
    marginTop: 14,
    fontSize: 12,
    color: '#64748b',
  },
});
