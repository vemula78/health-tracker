import Capacitor
import HealthKit

@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        let typesToRead = Set([
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .appleExerciseTime)!,
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKObjectType.quantityType(forIdentifier: .restingHeartRate)!,
        ])

        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            if success {
                call.resolve(["authorized": true])
            } else {
                call.reject("Permission denied", nil, error)
            }
        }
    }

    @objc func getTodayData(_ call: CAPPluginCall) {
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        var result: [String: Any] = [:]
        result["date"] = ISO8601DateFormatter().string(from: now).prefix(10)

        let dispatchGroup = DispatchGroup()

        // Steps
        dispatchGroup.enter()
        getTodayQuantity(type: .stepCount, unit: HKUnit.count()) { value in
            result["steps"] = Int(value)
            dispatchGroup.leave()
        }

        // Distance
        dispatchGroup.enter()
        getTodayQuantity(type: .distanceWalkingRunning, unit: HKUnit.kilometer()) { value in
            result["distanceKm"] = round(value * 1000) / 1000
            dispatchGroup.leave()
        }

        // Active Energy
        dispatchGroup.enter()
        getTodayQuantity(type: .activeEnergyBurned, unit: HKUnit.kilocalorie()) { value in
            result["activeEnergyKcal"] = Int(value)
            dispatchGroup.leave()
        }

        // Exercise Minutes
        dispatchGroup.enter()
        getTodayQuantity(type: .appleExerciseTime, unit: HKUnit.minute()) { value in
            result["exerciseMin"] = Int(value)
            dispatchGroup.leave()
        }

        // Resting Heart Rate
        dispatchGroup.enter()
        getTodayQuantity(type: .restingHeartRate, unit: HKUnit(from: "count/min")) { value in
            result["restingHR"] = Int(value)
            dispatchGroup.leave()
        }

        dispatchGroup.notify(queue: .main) {
            call.resolve(result)
        }
    }

    private func getTodayQuantity(type: HKQuantityTypeIdentifier, unit: HKUnit, completion: @escaping (Double) -> Void) {
        guard let quantityType = HKObjectType.quantityType(forIdentifier: type) else {
            completion(0)
            return
        }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: quantityType, quantitySamplePredicate: predicate, options: [.cumulativeSum, .discreteAverage]) { _, result, _ in
            if let result = result {
                if let sum = result.sumQuantity() {
                    completion(sum.doubleValue(for: unit))
                } else if let avg = result.averageQuantity() {
                    completion(avg.doubleValue(for: unit))
                } else {
                    completion(0)
                }
            } else {
                completion(0)
            }
        }

        healthStore.execute(query)
    }
}
