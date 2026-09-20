import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { formatRupiah, formatTanggal, todayString } from '../utils/format';
import { getRingkasan, getTerlaris, getOmset7Hari } from '../db/transaksiRepo';
import { getProdukMenipis, getPengaturan } from '../db/produkRepo';

export default function DashboardScreen({ navigation }: any) {
  const [ring, setRing] = useState({ trx:0, omset:0, diskon:0, qty:0 });
  const [terlaris, setTerlaris] = useState<any[]>([]);
  const [menipis, setMenipis] = useState<any[]>([]);
  const [omset7, setOmset7] = useState<any[]>([]);
  const [namaToko, setNamaToko] = useState('Toko Saya');
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRing(getRingkasan(todayString()));
    setTerlaris(getTerlaris(5,'hari'));
    setMenipis(getProdukMenipis());
    setOmset7(getOmset7Hari());
    const s = getPengaturan();
    setNamaToko(s.nama_toko || 'Toko Saya');
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const maxOmset = Math.max(...omset7.map(o => o.omset), 1);
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.greet}>Selamat datang 👋</Text>
          <Text style={s.toko}>{namaToko}</Text>
        </View>
        <View style={s.offlinePill}>
          <View style={s.dot}/><Text style={s.offlineText}>OFFLINE</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();setRefreshing(false);}} tintColor={Colors.primary}/>}>

        <Text style={s.date}>{formatTanggal(todayString())}</Text>

        <View style={s.statCard}>
          <Text style={s.statLabel}>Omset Hari Ini</Text>
          <Text style={[s.statVal,{color:Colors.primary,fontSize:28}]}>{formatRupiah(ring.omset)}</Text>
          <Text style={s.statSub}>{ring.trx} transaksi · {ring.qty} item terjual</Text>
        </View>
        <View style={s.row}>
          <View style={[s.statCard,{flex:1}]}>
            <Text style={s.statLabel}>Stok Menipis</Text>
            <Text style={[s.statVal,{color:menipis.length>0?Colors.danger:Colors.success}]}>{menipis.length}</Text>
          </View>
          <View style={[s.statCard,{flex:1}]}>
            <Text style={s.statLabel}>Total Diskon</Text>
            <Text style={[s.statVal,{color:Colors.accent}]}>{formatRupiah(ring.diskon)}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>OMSET 7 HARI</Text>
        <View style={s.card}>
          <View style={s.chartRow}>
            {omset7.length===0
              ? <Text style={{color:Colors.textMuted,flex:1,textAlign:'center'}}>Belum ada data</Text>
              : omset7.map((o,i)=>{
                  const h=Math.max(4,Math.round((o.omset/maxOmset)*72));
                  const d=new Date(o.tgl);
                  return (
                    <View key={i} style={s.barCol}>
                      <Text style={s.barVal}>{o.omset>=1000?Math.round(o.omset/1000)+'rb':o.omset}</Text>
                      <View style={[s.bar,{height:h}]}/>
                      <Text style={s.barDay}>{days[d.getDay()]}</Text>
                    </View>
                  );
                })
            }
          </View>
        </View>

        {menipis.length>0&&(
          <View style={s.alert}>
            <Text style={{fontSize:16}}>⚠️</Text>
            <Text style={s.alertText}><Text style={{fontWeight:'700'}}>Stok menipis: </Text>{menipis.map((p:any)=>p.nama+'('+p.stok+')').join(', ')}</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>PRODUK TERLARIS</Text>
        {terlaris.length===0
          ? <View style={s.card}><Text style={{color:Colors.textMuted,textAlign:'center',padding:16}}>Belum ada transaksi</Text></View>
          : terlaris.map((p,i)=>(
            <View key={i} style={[s.card,{flexDirection:'row',alignItems:'center',gap:10,marginBottom:8}]}>
              <Text style={{fontSize:20}}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'600'}}>{p.nama_produk}</Text>
                <Text style={{fontSize:11,color:Colors.textMuted}}>{p.qty} terjual</Text>
              </View>
              <Text style={{fontSize:13,fontWeight:'700',color:Colors.primary}}>{formatRupiah(p.omset)}</Text>
            </View>
          ))
        }

        <Text style={s.sectionTitle}>AKSI CEPAT</Text>
        <View style={s.row}>
          <TouchableOpacity style={[s.quickBtn,{flex:1}]} onPress={()=>navigation.navigate('TambahProduk')}>
            <Text style={{fontSize:24}}>➕</Text><Text style={s.quickLabel}>Tambah Produk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn,{flex:1}]} onPress={()=>navigation.navigate('Pengaturan')}>
            <Text style={{fontSize:24}}>⚙️</Text><Text style={s.quickLabel}>Pengaturan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14},
  greet:{color:'rgba(255,255,255,0.8)',fontSize:12},
  toko:{color:'#fff',fontSize:18,fontWeight:'700'},
  offlinePill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(255,255,255,0.15)',paddingHorizontal:10,paddingVertical:5,borderRadius:20},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'#5de87a'},
  offlineText:{color:'#fff',fontSize:10,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:Colors.background},
  content:{padding:16,paddingBottom:32},
  date:{fontSize:12,color:Colors.textMuted,marginBottom:12},
  row:{flexDirection:'row',gap:10,marginBottom:10},
  statCard:{backgroundColor:Colors.card,borderRadius:14,padding:14,borderWidth:1,borderColor:Colors.border,marginBottom:10},
  statLabel:{fontSize:11,color:Colors.textMuted,fontWeight:'600',marginBottom:4},
  statVal:{fontSize:22,fontWeight:'800'},
  statSub:{fontSize:11,color:Colors.textMuted,marginTop:3},
  sectionTitle:{fontSize:11,fontWeight:'700',color:Colors.textMuted,letterSpacing:0.5,marginBottom:8},
  card:{backgroundColor:Colors.card,borderRadius:14,padding:14,borderWidth:1,borderColor:Colors.border,marginBottom:10},
  chartRow:{flexDirection:'row',alignItems:'flex-end',height:100,gap:4},
  barCol:{flex:1,alignItems:'center',gap:4},
  bar:{width:'100%',backgroundColor:Colors.primary,borderRadius:4},
  barVal:{fontSize:8,color:Colors.textMuted},
  barDay:{fontSize:9,color:Colors.textMuted},
  alert:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:Colors.warningLight,borderColor:'#fde28a',borderWidth:1,borderRadius:10,padding:12,marginBottom:10},
  alertText:{flex:1,fontSize:12,color:Colors.text},
  quickBtn:{backgroundColor:Colors.card,borderRadius:12,padding:16,alignItems:'center',gap:6,borderWidth:1,borderColor:Colors.border},
  quickLabel:{fontSize:12,fontWeight:'600',color:Colors.text,textAlign:'center'},
});
