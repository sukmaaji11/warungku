import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { formatRupiah } from '../utils/format';
import { getAllProduk, getAllKategori, hapusProduk, Produk, Kategori } from '../db/produkRepo';
import { useCart } from '../store/cartStore';

export default function ProdukScreen({ navigation }: any) {
  const [list, setList] = useState<Produk[]>([]);
  const [kats, setKats] = useState<Kategori[]>([]);
  const [search, setSearch] = useState('');
  const [activeKat, setActiveKat] = useState(0);
  const { addItem, items } = useCart();

  const load = () => {
    setList(getAllProduk(search, activeKat));
    setKats(getAllKategori());
  };

  useFocusEffect(useCallback(() => { load(); }, [search, activeKat]));

  const getQty = (id: number) => items.find(i => i.produk.id === id)?.qty || 0;

  const handleLongPress = (item: Produk) => {
    Alert.alert(item.nama, 'Pilih aksi:', [
      { text: 'Edit', onPress: () => navigation.navigate('EditProduk', { id: item.id }) },
      { text: 'Hapus', style: 'destructive', onPress: () => { hapusProduk(item.id); load(); } },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: Produk }) => {
    const qty = getQty(item.id);
    const low = item.stok <= item.stok_minimum;
    return (
      <TouchableOpacity style={[s.card, qty>0&&s.cardActive]} onPress={()=>addItem(item)} onLongPress={()=>handleLongPress(item)}>
        {qty>0&&<View style={s.badge}><Text style={s.badgeText}>{qty}</Text></View>}
        <Text style={s.emoji}>🛍️</Text>
        <Text style={s.nama} numberOfLines={2}>{item.nama}</Text>
        <Text style={s.harga}>{formatRupiah(item.harga)}</Text>
        <Text style={[s.stok, low&&{color:Colors.danger}]}>Stok: {item.stok}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>📦 Produk</Text>
        <TouchableOpacity style={s.addBtn} onPress={()=>navigation.navigate('TambahProduk')}>
          <Text style={s.addBtnText}>+ Tambah</Text>
        </TouchableOpacity>
      </View>
      <View style={s.searchWrap}>
        <TextInput style={s.searchInput} placeholder="🔍  Cari produk..." value={search} onChangeText={setSearch} placeholderTextColor={Colors.textMuted}/>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.katScroll} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
        {kats.map(k=>(
          <TouchableOpacity key={k.id} style={[s.katChip,(activeKat===0&&k.id===1)||activeKat===k.id?s.katChipActive:null]} onPress={()=>setActiveKat(k.id===1?0:k.id)}>
            <Text style={[s.katText,(activeKat===0&&k.id===1)||activeKat===k.id?s.katTextActive:null]}>{k.nama}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList data={list} renderItem={renderItem} keyExtractor={i=>i.id.toString()}
        numColumns={3} contentContainerStyle={s.grid}
        ListEmptyComponent={<Text style={s.empty}>Tidak ada produk</Text>}/>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:Colors.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14},
  title:{color:'#fff',fontSize:18,fontWeight:'700'},
  addBtn:{backgroundColor:'rgba(255,255,255,0.2)',paddingHorizontal:14,paddingVertical:7,borderRadius:20},
  addBtnText:{color:'#fff',fontSize:13,fontWeight:'700'},
  searchWrap:{backgroundColor:Colors.background,padding:12},
  searchInput:{backgroundColor:Colors.card,borderRadius:10,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:Colors.text,borderWidth:1,borderColor:Colors.border},
  katScroll:{backgroundColor:Colors.background,flexGrow:0,paddingVertical:8},
  katChip:{paddingHorizontal:14,paddingVertical:6,borderRadius:20,backgroundColor:Colors.card,borderWidth:1,borderColor:Colors.border},
  katChipActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  katText:{fontSize:12,fontWeight:'600',color:Colors.textMuted},
  katTextActive:{color:'#fff'},
  grid:{padding:12,backgroundColor:Colors.background},
  card:{flex:1/3,margin:4,backgroundColor:Colors.card,borderRadius:12,padding:10,borderWidth:1,borderColor:Colors.border,position:'relative'},
  cardActive:{borderColor:Colors.primary,borderWidth:2},
  badge:{position:'absolute',top:6,right:6,backgroundColor:Colors.primary,borderRadius:10,width:20,height:20,alignItems:'center',justifyContent:'center',zIndex:1},
  badgeText:{color:'#fff',fontSize:10,fontWeight:'800'},
  emoji:{fontSize:28,textAlign:'center',marginBottom:6},
  nama:{fontSize:11,fontWeight:'600',marginBottom:3,lineHeight:15},
  harga:{fontSize:12,fontWeight:'800',color:Colors.primary},
  stok:{fontSize:10,color:Colors.textMuted,marginTop:2},
  empty:{textAlign:'center',color:Colors.textMuted,padding:32},
});
