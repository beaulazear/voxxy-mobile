import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isKeywordFormat } from '../../utils/recommendationsUtils';

export default function KeywordTags({ keywords, style }) {
    if (!keywords) return null;

    const isKeywords = isKeywordFormat(keywords);
    if (!isKeywords) return null;

    const cleaned = keywords.replace(/[\[\]]/g, '').trim();
    const tags = cleaned.split(/[,;]/).map(t => t.trim()).filter(t => t);

    return (
        <View style={[styles.keywordsContainer, style]}>
            {tags.map((tag, idx) => (
                <View key={idx} style={styles.keywordTag}>
                    <Text style={styles.keywordText}>{tag}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    keywordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    keywordTag: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },
    keywordText: {
        color: '#cc31e8',
        fontSize: 12,
        fontWeight: '600',
    },
});
