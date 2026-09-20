import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { formatRupiah } from '../utils/format';
import { useCart } from '../store/cartStore';
import { simpanTransaksi } from '../db/transaksiRepo';

const METODE = ['tunai','transfer','qris','hutang'];

export default function KasirScreen({ navigation }: any) {
  const { items, diskon, metode, updateQty, setDiskon, setMetode, clear, subtotal, total, totalItem } = useCart();
  const [bayar, setBayar] = useState('');
  const [modal, setModal] = useState(false);
  const [noTrx, setNoTrx] = useState('');

  const sub = subtotal(); const tot = total();
  const bayarNum = parseInt(bayar) || 0;
  const kembalian = Math.max(0, bayarNum - tot);

  const handleBayar = () => {
    if (items.length===0) { Alert.alert('Kasir kosong','Tambah produk dulu'); return; }
    if (metode==='tunai'&&bayarNum<tot) { Alert.alert('Kurang','Uang bayar kurang'); return; }
    try {
      const no = simpanTransaksi(
        items.map(i=>({produk_id:i.produk.id,nama_produk:i.produk.nama,harga:i.produk.harga,qty:i.qty,subtotal:i.subtotal})),
        sub, diskon, tot, bayarNum, metode
      );
      setNoTrx(no); setModal(true);
    } catch(e:any) { Alert.alert('Error', e.message||'Gagal simpan'); }
  };

  if (items.length===0) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.title}>🧾 Kasir</Text></View>
      <View style={s.empty}>
        <Text style={{fontSize:64}}>🛒</Text>
        <Text style={s.emptyTitle}>Keranjang Kosong</Text>
        <Text style={s.emptyText}>Pilih produk dari tab Produk</Text>
        <TouchableOpacity style={s.goBtn} onPress={()=>navigation.navigate('Produk')}>
          <Text style={s.goBtnText}>Pilih Produk →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>🧾 Kasir ({totalItem()} item)</Text>
        <TouchableOpacity onPress={()=>Alert.alert('Reset','Kosongkan semua?',[{text:'Batal',style:'cancel'},{text:'Reset',style:'destructive',onPress:()=>{clear();setBayar('');}}])}>
          <Text style={s.resetBtn}>Reset</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.sec}>ITEM</Text>
        {items.map(item=>(
          <View key={item.produk.id} style={s.itemRow}>
            <View style={{flex:1}}>
              <Text style={s.itemNama}>{item.produk.nama}</Text>
              <Text style={s.itemHarga}>{formatRupiah(item.produk.harga)} × {item.qty} = {formatRupiah(item.subtotal)}</Text>
            </View>
            <View style={s.qtyRow}>
              <TouchableOpacity style={[s.qBtn,{backgroundColor:Colors.dangerLight}]} onPress={()=>updateQty(item.produk.id,item.qty-1)}>
                <Text style={{fontSize:18,fontWeight:'800',color:Colors.danger}}>−</Text>
              </TouchableOpacity>
              <Text style={s.qNum}>{item.qty}</Text>
              <TouchableOpacity style={[s.qBtn,{backgroundColor:Colors.primaryLight}]} onPress={()=>updateQty(item.produk.id,item.qty+1)}>
                <Text style={{fontSize:18,fontWeight:'800',color:Colors.primary}}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={[s.sec,{marginTop:16}]}>DISKON</Text>
        <View style={s.diskonRow}>
          <Text style={{color:Colors.textMuted,marginRight:6}}>Rp</Text>
          <TextInput style={s.diskonInput} keyboardType="numeric" placeholder="0"
            value={diskon>0?diskon.toString():''} onChangeText={t=>setDiskon(parseInt(t)||0)} placeholderTextColor={Colors.textMuted}/>
        </View>

        <Text style={[s.sec,{marginTop:16}]}>METODE BAYAR</Text>
        <View style={s.metodeRow}>
          {METODE.map(m=>(
            <TouchableOpacity key={m} style={[s.metodeBtn,metode===m&&s.metodeBtnActive]} onPress={()=>setMetode(m)}>
              <Text style={[s.metodeTxt,metode===m&&s.metodeTxtActive]}>{m.charAt(0).toUpperCase()+m.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {metode==='tunai'&&<>
          <Text style={[s.sec,{marginTop:16}]}>JUMLAH BAYAR</Text>
          <TextInput style={s.bayarInput} keyboardType="numeric" placeholder="Masukkan jumlah uang..."
            value={bayar} onChangeText={t=>setBayar(t.replace(/\D/g,''))} placeholderTextColor={Colors.textMuted}/>
          {bayarNum>0&&<View style={s.kembalianBox}>
            <Text style={{color:Colors.success,fontWeight:'600'}}>Kembalian</Text>
            <Text style={{color:kembalian<0?Colors.danger:Colors.success,fontSize:16,fontWeight:'800'}}>
              {kembalian<0?'Kurang '+formatRupiah(-kembalian):formatRupiah(kembalian)}
            </Text>
          </View>}
          <View style={s.quickAmts}>
            {[tot,Math.ceil(tot/10000)*10000,50000,100000].filter((v,i,a)=>a.indexOf(v)===i&&v>=tot).slice(0,4).map(v=>(
              <TouchableOpacity key={v} style={s.quickAmt} onPress={()=>setBayar(v.toString())}>
                <Text style={s.quickAmtTxt}>{formatRupiah(v)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>}

        <View style={s.summaryCard}>
          <View style={s.sumRow}><Text style={s.sumLabel}>Subtotal</Text><Text style={s.sumVal}>{formatRupiah(sub)}</Text></View>
          {diskon>0&&<View style={s.sumRow}><Text style={s.sumLabel}>Diskon</Text><Text style={[s.sumVal,{color:Colors.danger}]}>- {formatRupiah(diskon)}</Text></View>}
          <View style={[s.sumRow,s.sumTotal]}>
            <Text style={s.totalLbl}>TOTAL</Text>
            <Text style={s.totalVal}>{formatRupiah(tot)}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.bayarBtn} onPress={handleBayar}>
          <Text style={s.bayarBtnTxt}>💳  Bayar · {formatRupiah(tot)}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.handle}/>
            <Text style={s.modalTitle}>✅ Transaksi Berhasil!</Text>
            <View style={s.struk}>
              <Text style={s.strukNo}>{noTrx}</Text>
              <View style={s.dash}/>
              {items.map((i,idx)=>(
                <View key={idx} style={s.strukRow}>
                  <Text style={s.strukItem}>{i.produk.nama} ×{i.qty}</Text>
                  <Text style={s.strukVal}>{formatRupiah(i.subtotal)}</Text>
                </View>
              ))}
              <View style={s.dash}/>
              {diskon>0&&<View style={s.strukRow}><Text style={s.strukItem}>Diskon</Text><Text style={[s.strukVal,{color:Colors.danger}]}>-{formatRupiah(diskon)}</Text></View>}
              <View style={[s.strukRow,{marginTop:4}]}>
                <Text style={[s.strukItem,{fontWeight:'800',fontSize:15}]}>TOTAL</Text>
                <Text style={[s.strukVal,{fontWeight:'800',fontSize:15,color:Colors.primary}]}>{formatRupiah(tot)}</Text>
              </View>
              {metode==='tunai'&&bayarNum>0&&<>
                <View style={s.strukRow}><Text style={s.strukItem}>Bayar</Text><Text style={s.strukVal}>{formatRupiah(bayarNum)}</Text></View>
                <View style={s.strukRow}><Text style={s.strukItem}>Kembali</Text><Text style={[s.strukVal,{color:Colors.success}]}>{formatRupiah(kembalian)}</Text></View>
              </>}
              <View style={s.dash}/>
              <Text style={s.strukFooter}>Terima kasih! 🙏</Text>
            </View>
            <TouchableOpacity style={s.selesaiBtn} onPress={()=>{setModal(false);clear();setBayar('');}}>
              <Text style={s.selesaiBtnTxt}>✅ Selesai & Transaksi Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14},
  title:{color:'#fff',fontSize:18,fontWeight:'700'},
  resetBtn:{color:'rgba(255,255,255,0.8)',fontSize:13,fontWeight:'600'},
  empty:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Colors.background,gap:10,padding:32},
  emptyTitle:{fontSize:20,fontWeight:'700'},
  emptyText:{fontSize:14,color:Colors.textMuted,textAlign:'center'},
  goBtn:{backgroundColor:Colors.primary,paddingHorizontal:24,paddingVertical:12,borderRadius:12,marginTop:8},
  goBtnText:{color:'#fff',fontWeight:'700',fontSize:14},
  scroll:{flex:1,backgroundColor:Colors.background},
  content:{padding:16,paddingBottom:32},
  sec:{fontSize:11,fontWeight:'700',color:Colors.textMuted,letterSpacing:0.5,marginBottom:8},
  itemRow:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.card,borderRadius:12,padding:12,marginBottom:8,borderWidth:1,borderColor:Colors.border,gap:10},
  itemNama:{fontSize:13,fontWeight:'600'},
  itemHarga:{fontSize:12,color:Colors.textMuted,marginTop:2},
  qtyRow:{flexDirection:'row',alignItems:'center',gap:8},
  qBtn:{width:30,height:30,borderRadius:8,alignItems:'center',justifyContent:'center'},
  qNum:{fontSize:15,fontWeight:'800',minWidth:24,textAlign:'center'},
  diskonRow:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.card,borderRadius:10,borderWidth:1,borderColor:Colors.border,paddingHorizontal:14},
  diskonInput:{flex:1,padding:12,fontSize:14,color:Colors.text},
  metodeRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  metodeBtn:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.border},
  metodeBtnActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  metodeTxt:{fontSize:13,fontWeight:'600',color:Colors.textMuted},
  metodeTxtActive:{color:'#fff'},
  bayarInput:{backgroundColor:Colors.card,borderRadius:10,borderWidth:1,borderColor:Colors.border,paddingHorizontal:14,paddingVertical:12,fontSize:16,fontWeight:'700',color:Colors.text},
  kembalianBox:{flexDirection:'row',justifyContent:'space-between',backgroundColor:Colors.successLight,borderRadius:10,padding:12,marginTop:8},
  quickAmts:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},
  quickAmt:{paddingHorizontal:12,paddingVertical:6,backgroundColor:Colors.card,borderRadius:8,borderWidth:1,borderColor:Colors.border},
  quickAmtTxt:{fontSize:12,fontWeight:'600',color:Colors.primary},
  summaryCard:{backgroundColor:Colors.card,borderRadius:14,padding:16,marginTop:16,borderWidth:1,borderColor:Colors.border},
  sumRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  sumLabel:{fontSize:13,color:Colors.textMuted},
  sumVal:{fontSize:13,fontWeight:'600'},
  sumTotal:{borderTopWidth:1,borderTopColor:Colors.border,paddingTop:10,marginTop:4,marginBottom:0},
  totalLbl:{fontSize:16,fontWeight:'800'},
  totalVal:{fontSize:20,fontWeight:'800',color:Colors.primary},
  bayarBtn:{backgroundColor:Colors.primary,borderRadius:14,padding:18,alignItems:'center',marginTop:12},
  bayarBtnTxt:{color:'#fff',fontSize:16,fontWeight:'800'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modalSheet:{backgroundColor:Colors.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,maxHeight:'90%'},
  handle:{width:40,height:4,backgroundColor:Colors.border,borderRadius:2,alignSelf:'center',marginBottom:16},
  modalTitle:{fontSize:20,fontWeight:'800',textAlign:'center',marginBottom:16,color:Colors.primary},
  struk:{backgroundColor:Colors.background,borderRadius:12,padding:16,marginBottom:16},
  strukNo:{textAlign:'center',fontSize:12,color:Colors.textMuted,marginBottom:8},
  dash:{borderTopWidth:1,borderTopColor:Colors.border,marginVertical:8},
  strukRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:4},
  strukItem:{fontSize:13,color:Colors.text,flex:1},
  strukVal:{fontSize:13,fontWeight:'600',color:Colors.text},
  strukFooter:{textAlign:'center',fontSize:12,color:Colors.textMuted,marginTop:4},
  selesaiBtn:{backgroundColor:Colors.primary,borderRadius:14,padding:16,alignItems:'center'},
  selesaiBtnTxt:{color:'#fff',fontSize:15,fontWeight:'800'},
});
