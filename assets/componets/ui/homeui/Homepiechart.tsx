import React, { Component } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import PieChart from "react-native-pie-chart";

export default class TestChart extends Component {
  render() {
    const widthAndHeight = 250;

    const series = [
      { value: 430, color: "#fbd203" },
      { value: 321, color: "#ffb300" },
      { value: 185, color: "#ff9100" },
      { value: 123, color: "#ff6c00" },
    ];

    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Doughnut</Text>
          <PieChart
            widthAndHeight={widthAndHeight}
            series={series}
            cover={0.45}
          />
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    margin: 10,
  },
});
