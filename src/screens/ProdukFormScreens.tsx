import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { tambahProduk, updateProduk, hapusProduk, getProdukById, getAllKategori, Kategori } from '../db/produkRepo';

const SATUAN = ['pcs','kg','liter','bungkus','botol','kotak','sachet'];
const DEFAULT = { nama:'', harga:'', harga_modal:'', stok:'', stok_minimum:'5', kategori_id:2, barcode:'', satuan:'pcs' };

function FormProduk({ initial, onSave, onDelete, navigation }: any) {
  const [form, setForm] = useState(initial);
  const [kats, setKats] = useState<Kategori[]>([]);
  const upd = (k:string,v:any) => setForm((p:any)=>({...p,[k]:v}));

  useEffect(()=>{ setKats(getAllKategori().filter((x:Kategori)=>x.id>1)); },[]);

  const margin = form.harga&&form.harga_modal ? parseInt(form.harga)-parseInt(form.harga_modal||'0') : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()}><Text style={s.back}>← Batal</Text></TouchableOpacity>
        <Text style={s.title}>{onDelete?'Edit Produk':'Tambah Produk'}</Text>
        <TouchableOpacity onPress={()=>onSave(form)}><Text style={s.saveBtn}>Simpan</Text></TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.sec}>INFORMASI</Text>
        <View style={s.card}>
          <View style={s.field}><Text style={s.lbl}>Nama *</Text><TextInput style={s.input} value={form.nama} onChangeText={v=>upd('nama',v)} placeholder="Nama produk..." placeholderTextColor={Colors.textMuted}/></View>
          <View style={s.div}/>
          <View style={s.field}><Text style={s.lbl}>Barcode</Text><TextInput style={s.input} value={form.barcode||''} onChangeText={v=>upd('barcode',v)} keyboardType="numeric" placeholder="Opsional" placeholderTextColor={Colors.textMuted}/></View>
          <View style={s.div}/>
          <View style={s.field}>
            <Text style={s.lbl}>Satuan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex:1}}>
              <View style={{flexDirection:'row',gap:6}}>
                {SATUAN.map(st=>(
                  <TouchableOpacity key={st} style={[s.chip,form.satuan===st&&s.chipActive]} onPress={()=>upd('satuan',st)}>
                    <Text style={[s.chipTxt,form.satuan===st&&s.chipTxtActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <Text style={s.sec}>HARGA</Text>
        <View style={s.card}>
          <View style={s.field}><Text style={s.lbl}>Harga Jual *</Text><TextInput style={s.input} value={form.harga} onChangeText={v=>upd('harga',v.replace(/\D/g,''))} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted}/></View>
          <View style={s.div}/>
          <View style={s.field}><Text style={s.lbl}>Harga Modal</Text><TextInput style={s.input} value={form.harga_modal} onChangeText={v=>upd('harga_modal',v.replace(/\D/g,''))} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted}/></View>
          {margin>0&&<View style={s.marginInfo}><Text style={s.marginTxt}>💹 Margin: Rp {margin.toLocaleString('id-ID')} ({Math.round(margin/parseInt(form.harga)*100)}%)</Text></View>}
        </View>

        <Text style={s.sec}>STOK</Text>
        <View style={s.card}>
          <View style={s.field}><Text style={s.lbl}>Stok</Text><TextInput style={s.input} value={form.stok} onChangeText={v=>upd('stok',v.replace(/\D/g,''))} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted}/></View>
          <View style={s.div}/>
          <View style={s.field}><Text style={s.lbl}>Stok Min.</Text><TextInput style={s.input} value={form.stok_minimum} onChangeText={v=>upd('stok_minimum',v.replace(/\D/g,''))} keyboardType="numeric" placeholder="5" placeholderTextColor={Colors.textMuted}/></View>
        </View>

        <Text style={s.sec}>KATEGORI</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}}>
          {kats.map((k:Kategori)=>(
            <TouchableOpacity key={k.id} style={[s.chip,form.kategori_id===k.id&&s.chipActive]} onPress={()=>upd('kategori_id',k.id)}>
              <Text style={[s.chipTxt,form.kategori_id===k.id&&s.chipTxtActive]}>{k.nama}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {onDelete&&(
          <TouchableOpacity style={s.dangerBtn} onPress={onDelete}>
            <Text style={s.dangerTxt}>🗑️ Hapus Produk</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function TambahProdukScreen({ navigation }: any) {
  const save = (form: any) => {
    if (!form.nama.trim()) { Alert.alert('Error','Nama produk wajib diisi'); return; }
    if (!form.harga||parseInt(form.harga)<=0) { Alert.alert('Error','Harga jual wajib diisi'); return; }
    tambahProduk({ nama:form.nama.trim(), harga:parseInt(form.harga)||0, harga_modal:parseInt(form.harga_modal)||0, stok:parseInt(form.stok)||0, stok_minimum:parseInt(form.stok_minimum)||5, kategori_id:form.kategori_id, barcode:form.barcode||undefined, satuan:form.satuan });
    navigation.goBack();
  };
  return <FormProduk initial={{...DEFAULT}} onSave={save} navigation={navigation}/>;
}

export function EditProdukScreen({ route, navigation }: any) {
  const [initial, setInitial] = useState<any>(null);
  const id = route.params?.id;

  useEffect(()=>{
    const p = getProdukById(id);
    if(p) setInitial({...p,harga:p.harga.toString(),harga_modal:p.harga_modal.toString(),stok:p.stok.toString(),stok_minimum:p.stok_minimum.toString()});
  },[id]);

  const save = (form:any) => {
    if (!form.nama.trim()) { Alert.alert('Error','Nama wajib diisi'); return; }
    updateProduk(id,{nama:form.nama,harga:parseInt(form.harga)||0,harga_modal:parseInt(form.harga_modal)||0,stok:parseInt(form.stok)||0,stok_minimum:parseInt(form.stok_minimum)||5,kategori_id:form.kategori_id,barcode:form.barcode,satuan:form.satuan});
    navigation.goBack();
  };

  const del = () => Alert.alert('Hapus','Yakin hapus?',[
    {text:'Batal',style:'cancel'},
    {text:'Hapus',style:'destructive',onPress:()=>{ hapusProduk(id); navigation.goBack(); }}
  ]);

  if (!initial) return <View style={{flex:1,backgroundColor:Colors.primary}}/>;
  return <FormProduk initial={initial} onSave={save} onDelete={del} navigation={navigation}/>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14},
  title:{color:'#fff',fontSize:16,fontWeight:'700'},
  back:{color:'rgba(255,255,255,0.8)',fontSize:14},
  saveBtn:{color:'#f5a623',fontSize:14,fontWeight:'800'},
  scroll:{flex:1,backgroundColor:Colors.background},
  content:{padding:16,paddingBottom:40},
  sec:{fontSize:11,fontWeight:'700',color:Colors.textMuted,letterSpacing:0.5,marginBottom:8,marginTop:4},
  card:{backgroundColor:Colors.card,borderRadius:14,borderWidth:1,borderColor:Colors.border,marginBottom:8,overflow:'hidden'},
  field:{paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12},
  lbl:{fontSize:13,fontWeight:'600',width:90},
  input:{flex:1,fontSize:14,color:Colors.text},
  div:{height:1,backgroundColor:Colors.border,marginHorizontal:16},
  marginInfo:{backgroundColor:Colors.primaryLight,padding:12,margin:8,borderRadius:8},
  marginTxt:{fontSize:12,color:Colors.primary,fontWeight:'600'},
  chip:{paddingHorizontal:12,paddingVertical:6,borderRadius:20,backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.border},
  chipActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  chipTxt:{fontSize:12,fontWeight:'600',color:Colors.textMuted},
  chipTxtActive:{color:'#fff'},
  dangerBtn:{backgroundColor:Colors.dangerLight,borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:'rgba(231,76,60,0.25)'},
  dangerTxt:{fontSize:14,fontWeight:'700',color:Colors.danger},
});
