import { TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React from 'react';
import { reject } from 'rsvp';

export const colors = {
    gray: ['#5B748A', '#587189'],
    orange: ['#FFA264', '#A24A04'],
    blue: ['#0097F8', '#00145C'],
    yellow: ['#FCF300', '#B0A000'],
    green: ['#00F815', '#005C05'],
    red: ['#FF0000', '#A20000'],
    black: ['#000000', '#000000'],
    disabled: ['#A8C2D8', '#A8C2D8']
}

export function getSquareButton(func, color, selectedColor, txt, icon, size, selected, dimensions) {
    let dim = {
        width: styles.squareShapeView.width,
        width: styles.squareShapeView.height
    }
    if (dimensions) {
        dim = dimensions
    }

    return <TouchableOpacity
        onPress={func}
    >
        <LinearGradient
            colors={selected ? selectedColor : color}
            style={[styles.squareShapeView, dim, selected ? styles.selected : styles.notSelected]}>
            <Text style={{ fontSize: size, color: 'white' }}>{txt?txt:''}</Text>
            {icon?<Icon name={icon} size={size} color='white' />:null}
        </LinearGradient>
    </TouchableOpacity>
}

export async function getImageDimensions(uri) {
    return new Promise(
        (resolve, reject) => {
            Image.getSize(uri, (width, height) => {
                resolve({ w: width, h: height });
            },
            (err) => {
                //Alert.alert(err)
                reject(err)
            });
        }
    );
}

const styles = StyleSheet.create({
    squareShapeView: {
        marginHorizontal: 2.5,
        alignItems:'center',
        alignContent:'center',
        flexDirection:'row',
        height: 50,
        width: 50,
        backgroundColor: '#39579A',
        justifyContent: 'center',
        borderRadius: 5
    },
    selected: {
        marginVertical: 0
    },
    notSelected: {
        marginVertical: 10
    },
});