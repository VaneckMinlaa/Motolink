import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
  currentStep: number;
  steps: string[];
}

export default function ProgressBar({ currentStep, steps }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.progressLine}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View style={styles.stepContainer}>
              <View style={[
                styles.stepCircle,
                index <= currentStep ? styles.activeCircle : styles.inactiveCircle
              ]}>
                {index <= currentStep && (
                  <View style={styles.activeDot} />
                )}
              </View>
              <Text style={[
                styles.stepText,
                index <= currentStep ? styles.activeText : styles.inactiveText
              ]}>
                {step}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.connector,
                index < currentStep ? styles.activeConnector : styles.inactiveConnector
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeCircle: {
    backgroundColor: '#28a745',
  },
  inactiveCircle: {
    backgroundColor: '#e0e0e0',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#28a745',
  },
  inactiveText: {
    color: '#999',
  },
  connector: {
    height: 2,
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 20,
  },
  activeConnector: {
    backgroundColor: '#28a745',
  },
  inactiveConnector: {
    backgroundColor: '#e0e0e0',
  },
});