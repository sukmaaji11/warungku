import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { formatRupiah, formatTanggal, todayString } from '../utils/format';
import { getRingkasan, getTerlaris, getTrxHarian, getOmset7Hari } from '../db/transaksiRepo';
import { getPengaturan } from '../db/produkRepo';

type Periode = 'hari'|'bulan'|'tahun';

export default function LaporanScreen() {
  const [ring, setRing] = useState({trx:0,omset:0,diskon:0,qty:0});
  const [terlaris, setTerlaris] = useState<any[]>([]);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [omset7, setOmset7] = useState<any[]>([]);
  const [periode, setPeriode] = useState<Periode>('hari');
  const [namaToko, setNamaToko] = useState('');

  const load = () => {
    setRing(getRingkasan(todayString()));
    setTerlaris(getTerlaris(5, periode));
    setRiwayat(getTrxHarian(todayString()));
    setOmset7(getOmset7Hari());
    setNamaToko(getPengaturan().nama_toko||'');
  };

  useFocusEffect(useCallback(()=>{load();},[periode]));

  const share = () => {
    const msg = '📊 *Laporan '+namaToko+'*\n📅 '+formatTanggal(todayString())+'\n\n💰 Omset: '+formatRupiah(ring.omset)+'\n🧾 Transaksi: '+ring.trx+'\n📦 Item: '+ring.qty+'\n\n_Via Kasir WarungKu_';
    Share.share({message:msg});
  };

  const maxO = Math.max(...omset7.map(o=>o.omset),1);
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>📊 Laporan</Text>
        <TouchableOpacity style={s.shareBtn} onPress={share}><Text style={s.shareTxt}>Share WA</Text></TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.date}>{formatTanggal(todayString())}</Text>
        <View style={s.statCard}><Text style={s.statLabel}>Total Omset Hari Ini</Text><Text style={[s.statVal,{color:Colors.primary,fontSize:28}]}>{formatRupiah(ring.omset)}</Text></View>
        <View style={s.row}>
          <View style={[s.statCard,{flex:1}]}><Text style={s.statLabel}>Transaksi</Text><Text style={s.statVal}>{ring.trx}</Text></View>
          <View style={[s.statCard,{flex:1}]}><Text style={s.statLabel}>Item</Text><Text style={s.statVal}>{ring.qty}</Text></View>
          <View style={[s.statCard,{flex:1}]}><Text style={s.statLabel}>Diskon</Text><Text style={[s.statVal,{color:Colors.accent,fontSize:13}]}>{formatRupiah(ring.diskon)}</Text></View>
        </View>

        <Text style={s.sec}>OMSET 7 HARI</Text>
        <View style={s.card}>
          <View style={s.chartRow}>
            {omset7.length===0?<Text style={{color:Colors.textMuted,flex:1,textAlign:'center'}}>Belum ada data</Text>
              :omset7.map((o,i)=>{
                const h=Math.max(4,Math.round((o.omset/maxO)*80));
                const d=new Date(o.tgl);
                return(<View key={i} style={s.barCol}>
                  <Text style={s.barVal}>{o.omset>=1000?Math.round(o.omset/1000)+'rb':o.omset}</Text>
                  <View style={[s.bar,{height:h}]}/><Text style={s.barDay}>{days[d.getDay()]}</Text>
                </View>);
              })}
          </View>
        </View>

        <View style={s.secRow}>
          <Text style={s.sec}>PRODUK TERLARIS</Text>
          <View style={s.periodeRow}>
            {(['hari','bulan','tahun'] as Periode[]).map(p=>(
              <TouchableOpacity key={p} style={[s.pBtn,periode===p&&s.pBtnActive]} onPress={()=>setPeriode(p)}>
                <Text style={[s.pTxt,periode===p&&s.pTxtActive]}>{p.charAt(0).toUpperCase()+p.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {terlaris.length===0?<View style={s.card}><Text style={{color:Colors.textMuted,textAlign:'center',padding:16}}>Belum ada data</Text></View>
          :terlaris.map((p,i)=>(
          <View key={i} style={[s.card,{flexDirection:'row',alignItems:'center',gap:10,marginBottom:8}]}>
            <Text style={{fontSize:20}}>{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</Text>
            <View style={{flex:1}}><Text style={{fontSize:13,fontWeight:'600'}}>{p.nama_produk}</Text><Text style={{fontSize:11,color:Colors.textMuted}}>{p.qty} terjual</Text></View>
            <Text style={{fontSize:13,fontWeight:'700',color:Colors.primary}}>{formatRupiah(p.omset)}</Text>
          </View>
        ))}

        <Text style={[s.sec,{marginTop:8}]}>RIWAYAT TRANSAKSI</Text>
        {riwayat.length===0?<View style={s.card}><Text style={{color:Colors.textMuted,textAlign:'center',padding:16}}>Belum ada transaksi</Text></View>
          :riwayat.map((t,i)=>(
          <View key={i} style={[s.card,{flexDirection:'row',alignItems:'center',marginBottom:8}]}>
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'600'}}>{t.no_trx}</Text>
              <Text style={{fontSize:11,color:Colors.textMuted}}>{t.waktu?.substring(11,16)} · {t.metode_bayar}</Text>
            </View>
            <Text style={{fontSize:14,fontWeight:'800',color:Colors.primary}}>{formatRupiah(t.total)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14},
  title:{color:'#fff',fontSize:18,fontWeight:'700'},
  shareBtn:{backgroundColor:'rgba(255,255,255,0.2)',paddingHorizontal:14,paddingVertical:7,borderRadius:20},
  shareTxt:{color:'#fff',fontSize:13,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:Colors.background},
  content:{padding:16,paddingBottom:32},
  date:{fontSize:12,color:Colors.textMuted,marginBottom:12},
  row:{flexDirection:'row',gap:8,marginBottom:10},
  statCard:{backgroundColor:Colors.card,borderRadius:14,padding:14,borderWidth:1,borderColor:Colors.border,marginBottom:10},
  statLabel:{fontSize:11,color:Colors.textMuted,fontWeight:'600',marginBottom:4},
  statVal:{fontSize:22,fontWeight:'800'},
  sec:{fontSize:11,fontWeight:'700',color:Colors.textMuted,letterSpacing:0.5,marginBottom:8},
  secRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  periodeRow:{flexDirection:'row',gap:4},
  pBtn:{paddingHorizontal:10,paddingVertical:4,borderRadius:12,backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.border},
  pBtnActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  pTxt:{fontSize:11,fontWeight:'600',color:Colors.textMuted},
  pTxtActive:{color:'#fff'},
  card:{backgroundColor:Colors.card,borderRadius:14,padding:14,borderWidth:1,borderColor:Colors.border,marginBottom:10},
  chartRow:{flexDirection:'row',alignItems:'flex-end',height:110,gap:4},
  barCol:{flex:1,alignItems:'center',gap:4},
  bar:{width:'100%',backgroundColor:Colors.primary,borderRadius:4},
  barVal:{fontSize:8,color:Colors.textMuted},
  barDay:{fontSize:9,color:Colors.textMuted},
});
