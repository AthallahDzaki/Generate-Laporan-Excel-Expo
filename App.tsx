import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const JSON_FILE_URI = FileSystem.documentDirectory 
  ? `${FileSystem.documentDirectory}data-laporan-lokal.json` 
  : null;

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function App() {
  const { width } = useWindowDimensions();
  
  const [laporanData, setLaporanData] = useState<LaporanRow[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [inputProduk, setInputProduk] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [inputHarga, setInputHarga] = useState('');

  useEffect(() => {
    const muatDataLokal = async () => {
      if (!JSON_FILE_URI) return;
      try {
        const fileInfo = await FileSystem.getInfoAsync(JSON_FILE_URI);
        if (fileInfo.exists) {
          const fileContent = await FileSystem.readAsStringAsync(JSON_FILE_URI);
          const dataTersimpan = JSON.parse(fileContent);
          setLaporanData(dataTersimpan);
        }
      } catch (error) {
        console.log('Gagal memuat data lokal:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };

    muatDataLokal();
  }, []);

  const simpanDataLokal = async (dataBaru: LaporanRow[]) => {
    if (!JSON_FILE_URI) return;
    try {
      await FileSystem.writeAsStringAsync(JSON_FILE_URI, JSON.stringify(dataBaru));
    } catch (error) {
      console.log('Gagal menyimpan data lokal:', error);
    }
  };

  const totalKeseluruhan = useMemo(
    () => laporanData.reduce((sum, item) => sum + item.total, 0),
    [laporanData]
  );

  const cardStyle = useMemo(
    () => [styles.card, { width: Math.min(width - 32, 540) }],
    [width]
  );

  const tambahData = () => {
    if (!inputProduk || !inputQty || !inputHarga) {
      Alert.alert('Validasi', 'Harap isi semua kolom (Produk, Qty, Harga).');
      return;
    }

    const qty = parseInt(inputQty, 10);
    const harga = parseInt(inputHarga, 10);

    if (isNaN(qty) || isNaN(harga)) {
      Alert.alert('Validasi', 'Qty dan Harga harus berupa angka.');
      return;
    }

    const newData: LaporanRow = {
      tanggal: getTodayDate(),
      produk: inputProduk,
      qty: qty,
      harga: harga,
      total: qty * harga,
    };

    const updatedData = [...laporanData, newData];
    
    setLaporanData(updatedData);
    simpanDataLokal(updatedData);
    
    setInputProduk('');
    setInputQty('');
    setInputHarga('');
    setFileUri(null);
  };

  const resetData = () => {
    Alert.alert('Konfirmasi', 'Yakin ingin menghapus semua data?', [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', 
        style: 'destructive',
        onPress: () => {
          setLaporanData([]);
          simpanDataLokal([]);
          setFileUri(null);
        }
      }
    ]);
  };

  const generateExcel = async () => {
    // Menampilkan alert "Tidak ada Laporan" jika datanya kosong
    if (laporanData.length === 0) {
      Alert.alert('Info', 'Tidak ada Laporan');
      return;
    }

    if (!FileSystem.documentDirectory) {
      Alert.alert('Gagal', 'Penyimpanan lokal tidak tersedia di perangkat ini.');
      return;
    }

    try {
      setIsGenerating(true);

      const worksheet = XLSX.utils.json_to_sheet(laporanData);
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
      Alert.alert('Berhasil', 'File Excel (.xlsx) berhasil dibuat.');
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
      dialogTitle: 'Download/Bagikan Laporan Excel (.xlsx)',
      UTI: EXCEL_MIME,
    });
  };

  if (!isDataLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Memuat data tersimpan...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={cardStyle}>
          <Text style={styles.title}>Laporan Penjualan</Text>
          <Text style={styles.subtitle}>
            Data tersimpan secara lokal. Generate & download file berformat .xlsx.
          </Text>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nama Produk"
              value={inputProduk}
              onChangeText={setInputProduk}
            />
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Qty"
                keyboardType="numeric"
                value={inputQty}
                onChangeText={setInputQty}
              />
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Harga Satuan"
                keyboardType="numeric"
                value={inputHarga}
                onChangeText={setInputHarga}
              />
            </View>
            <Pressable style={styles.addButton} onPress={tambahData}>
              <Text style={styles.addButtonText}>+ Tambah Data</Text>
            </Pressable>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Penjualan</Text>
            <Text style={styles.summaryValue}>{formatRupiah(totalKeseluruhan)}</Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell, styles.tanggal]}>Tanggal</Text>
            <Text style={[styles.cell, styles.headerCell, styles.produk]}>Produk</Text>
            <Text style={[styles.cell, styles.headerCell, styles.total]}>Total</Text>
          </View>

          {/* Menampilkan pesan "Tidak ada Laporan" di UI */}
          {laporanData.length > 0 ? (
            laporanData.map((item, index) => (
              <View key={index.toString()} style={styles.tableRow}>
                <Text style={[styles.cell, styles.tanggal]}>{item.tanggal}</Text>
                <Text style={[styles.cell, styles.produk]}>{item.produk}</Text>
                <Text style={[styles.cell, styles.total]}>{formatRupiah(item.total)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Tidak ada Laporan</Text>
          )}

          {laporanData.length > 0 && (
            <Pressable style={styles.resetButton} onPress={resetData}>
              <Text style={styles.resetButtonText}>Hapus Semua Data</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, styles.primaryButton, isGenerating && styles.disabledButton]}
            onPress={generateExcel}
            disabled={isGenerating}
          >
            <Text style={styles.buttonText}>
              {isGenerating ? 'Membuat Excel...' : 'Generate Excel (.xlsx)'}
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
  formContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  inputRow: {
    flexDirection: 'row',
  },
  addButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryBox: {
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
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
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
