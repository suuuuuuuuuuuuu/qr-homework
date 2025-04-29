import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column', // 縦方向に並べる
        backgroundColor: 'white',
        padding: 10
    },
    row: {
        flexDirection: 'row', // 横方向に並べる
        justifyContent: 'space-between',
        marginBottom: 10
    },
    imageContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5
    },
    image: {
        maxWidth: 100,
        maxHeight: 100,
        objectFit: 'contain'
    }
});

const MyDocument = ({ texts }) => {

    const imageSrc = texts.map((url) => {
        return QRCode.toDataURL(url, { type: "png" });
    });

    const rows = [];
    for (let i = 0; i < imageSrc.length; i += 5) {
        rows.push(imageSrc.slice(i, i + 5));
    }

    const pages = [];
    for (let i = 0; i < rows.length; i += 6) {
        pages.push(rows.slice(i, i + 6));
    }

    return (
        <Document>
            {pages.map((pageRows, pageIndex) => (
                <Page key={pageIndex} size="A4" style={styles.page}>
                    {pageRows.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.row}>
                            {row.map((image, index) => (
                                <View key={index} style={styles.imageContainer}>
                                    <Image src={image} style={styles.image} />
                                    <Text style={{ fontSize: 10 }}>{texts[index + (rowIndex + pageIndex * 6) * 5]}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </Page>
            ))}
        </Document>
    );
};

export default MyDocument;