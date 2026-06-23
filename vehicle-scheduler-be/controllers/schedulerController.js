const axios = require("axios");
const { optimizeVehicles } = require("../services/schedulerService");
const Log = require("../../logging-middleware/logger");

const BASE_URL = process.env.BASE_URL || "http://20.244.56.144/evaluation-service";

exports.getSchedule = async (req, res) => {
  try {
    const TOKEN = process.env.ACCESS_TOKEN;

    const depotsResponse = await axios.get(
      `${BASE_URL}/depots`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    const vehiclesResponse = await axios.get(
      `${BASE_URL}/vehicles`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    const depots = depotsResponse.data.depots;
    const vehicles = vehiclesResponse.data.vehicles;

    const results = depots.map((depot) => {
      const schedule = optimizeVehicles(
        vehicles,
        depot.MechanicHours
      );

      return {
        depotId: depot.ID,
        mechanicHours: depot.MechanicHours,
        totalImpact: schedule.totalImpact,
        selectedVehicles: schedule.selectedVehicles,
      };
    });

    res.status(200).json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error(error);
    await Log("backend", "error", "vehicle-scheduler-be", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};