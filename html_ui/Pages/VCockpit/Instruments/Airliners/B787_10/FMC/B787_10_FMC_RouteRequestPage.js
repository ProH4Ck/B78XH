class B787_10_FMC_RouteRequestPage {
	constructor(fmc) {
		this.fmc = fmc;
	}

	showPage() {
		this.fmc.clearDisplay();

		this.fmc.setTemplate([
			['FLIGHT PLANS'],
			[''],
			['LOAD FP FROM SB'],
			[''],
			[''],
			[''],
			[''],
			[''],
			[''],
			[''],
			[''],
			[''],
			['<BACK']
		]);

		this.setupInputHandlers();

		this.fmc.updateSideButtonActiveStatus();
	}

	setupInputHandlers() {
		this.fmc.onLeftInput[5] = () => {
			B787_10_FMC_RoutePage.ShowPage1(this.fmc);
		};

		this.fmc.onLeftInput[0] = () => {
			/**
			 * Callback hell
			 */

			let updateFlightPlan = () => {
				updateFlightNumber();
				updateCostIndex();
				updateCruiseAltitude();
				updateRoute();
			};

			let updateRoute = () => {
				updateOrigin();
			};

			let updateOrigin = () => {
				this.fmc.updateRouteOrigin(this.flightPlan.origin['icao_code'], () => {
					updateDestination();
				});
			};

			let updateDestination = () => {
				this.fmc.updateRouteDestination(this.flightPlan.destination['icao_code'], () => {
					//parseNavlog();
					updateWaypoints();
				});
			};

			let updateFlightNumber = () => {
				this.fmc.updateFlightNo(this.flightPlan.general['flight_number']);
			};

			let updateCostIndex = () => {
				this.fmc.tryUpdateCostIndex(this.flightPlan.general['cruise_profile'].replace('CI', ''));
			};

			let updateCruiseAltitude = () => {
				this.fmc.setCruiseFlightLevelAndTemperature(this.flightPlan.general['initial_altitude']);
			};

			let parseNavlog = () => {
				let waypoints = [];
				let finalWaypoints = [];

				let sid = (this.flightPlan.navlog.fix[0] !== 'DCT' ? this.flightPlan.navlog.fix[0].via_airway : '')
				let star = (this.flightPlan.navlog.fix[this.flightPlan.navlog.fix.length- 1] !== 'DCT' ? this.flightPlan.navlog.fix[this.flightPlan.navlog.fix.length- 1].via_airway : '')

				/**
				 * Remove SID, STAR, TOC and TOD
				 */
				this.flightPlan.navlog.fix.forEach((fix) => {
					if ((fix.ident !== 'TOD' && fix.ident !== 'TOC' && fix.is_sid_star != 1 && fix.via_airway !== sid && fix.via_airway !== star) || fix.via_airway === 'DCT') {
						waypoints.push({ident: fix.ident, airway: fix.via_airway, altitude: fix.altitude_feet});
					}
				});

				/**
				 * SET first waypoint to DCT
				 */

				waypoints[0].airway = 'DCT';

				/**
				 * GROUP BY Airway
				 */

				let lastAirway = '';
				waypoints.forEach((waypoint) => {
					if (lastAirway === waypoint.airway && waypoint.airway !== 'DCT') {
						finalWaypoints.pop();
					}
					finalWaypoints.push(waypoint);
					lastAirway = waypoint.airway;
				});

				this.waypoints = finalWaypoints;
			};

			let updateWaypoints = async () => {
				let iterator = 0;
				parseNavlog();
				// TRUKN2 TIPRE Q126 GAROT DCT EKR J84 SNY DCT FOD DCT DBQ DCT KG75M DCT DAFLU J70 LVZ LENDY6
				// TRUKN2 TIPRE Q126 GAROT EKR J84 SNY FOD DBQ KG75M DAFLU J70 MAGIO J70 LVZ LENDY6

				let insertWaypoint = async () => {
					if (iterator >= this.waypoints.length) {
						B787_10_FMC_RoutePage.ShowPage1(this.fmc);
					}

					if (this.waypoints[iterator].airway !== 'DCT') {
						let lastWaypoint = this.fmc.flightPlanManager.getWaypoints()[this.fmc.flightPlanManager.getEnRouteWaypointsLastIndex()];
						if (lastWaypoint.infos instanceof WayPointInfo) {
							lastWaypoint.infos.UpdateAirway(this.waypoints[iterator].airway).then(() => {
								let airway = lastWaypoint.infos.airways.find(a => { return a.name === this.waypoints[iterator].airway; });
								if (airway) {
									this.fmc.setTemplate([
										['FLIGHT PLANS'],
										[''],
										[''],
										[''],
										[''],
										[''],
										['[color=yellow]ADD AIRWAY: ' + this.waypoints[iterator].airway + '[/color]'],
										[''],
										['[color=yellow]WAYPOINT: ' + this.waypoints[iterator].ident + '[/color]'],
										[''],
										[''],
										[''],
										['']
									]);
									this.fmc.onLeftInput[0] = undefined;
									this.fmc.onLeftInput[1] = undefined;
									this.fmc.onLeftInput[2] = undefined;
									this.fmc.onLeftInput[3] = undefined;
									this.fmc.onLeftInput[4] = undefined;
									this.fmc.onLeftInput[5] = undefined;
									this.fmc.updateSideButtonActiveStatus();
									this.insertWaypointsAlongAirway(this.waypoints[iterator].ident, this.fmc.flightPlanManager.getWaypointsCount() - 1, this.waypoints[iterator].airway, () => {
										iterator++;
										insertWaypoint();
									});
								} else {
									iterator++;
									insertWaypoint();
								}
							});
						}
					} else {
						this.fmc.setTemplate([
							['FLIGHT PLANS'],
							[''],
							[''],
							[''],
							[''],
							[''],
							['[color=yellow]ADD AIRWAY: ' + 'DCT' + '[/color]'],
							[''],
							['[color=yellow]WAYPOINT: ' + this.waypoints[iterator].ident + '[/color]'],
							[''],
							[''],
							[''],
							['']
						]);
						this.fmc.onLeftInput[0] = undefined;
						this.fmc.onLeftInput[1] = undefined;
						this.fmc.onLeftInput[2] = undefined;
						this.fmc.onLeftInput[3] = undefined;
						this.fmc.onLeftInput[4] = undefined;
						this.fmc.onLeftInput[5] = undefined;
						this.fmc.updateSideButtonActiveStatus();
						this.fmc.insertWaypoint(this.waypoints[iterator].ident, this.fmc.flightPlanManager.getWaypointsCount() - 1, () => {
							iterator++;
							insertWaypoint();
						});
					}
				};

				await insertWaypoint();
			};

			let simBrief = new SimBrief();
			let fp = simBrief.getFlightPlan();

			fp.then((flightPlan) => {
				this.flightPlan = flightPlan;
				updateFlightPlan();
			});
		};
	}

	async insertWaypointsAlongAirway(lastWaypointIdent, index, airwayName, callback = EmptyCallback.Boolean) {
		let referenceWaypoint = this.fmc.flightPlanManager.getWaypoint(index - 1);
		if (referenceWaypoint) {
			let infos = referenceWaypoint.infos;
			if (infos instanceof WayPointInfo) {
				let airway = infos.airways.find(a => {
					return a.name === airwayName;
				});
				if (airway) {
					let firstIndex = airway.icaos.indexOf(referenceWaypoint.icao);
					let lastWaypointIcao = airway.icaos.find(icao => {
						return icao.indexOf(lastWaypointIdent) !== -1;
					});
					let lastIndex = airway.icaos.indexOf(lastWaypointIcao);
					if (firstIndex >= 0) {
						if (lastIndex >= 0) {
							let inc = 1;
							if (lastIndex < firstIndex) {
								inc = -1;
							}
							let count = Math.abs(lastIndex - firstIndex);
							let asyncInsertWaypointByIcao = async (icao, index) => {
								return new Promise(resolve => {
									this.fmc.flightPlanManager.addWaypoint(icao, index, () => {
										const waypoint = this.fmc.flightPlanManager.getWaypoint(index);
										waypoint.infos.UpdateAirway(airwayName).then(() => {
											//waypoint.infos.airwayIn = airwayName;
											//if (i < count) {
											//	waypoint.infos.airwayOut = airwayName;
											//}
											//console.log("icao:" + icao + " added");
											resolve();
										});
									});
								});
							};
							let outOfSync = async (icaoIndex, realIndex) => {
								await asyncInsertWaypointByIcao(airway.icaos[icaoIndex], realIndex);
							};

							for (let i = 1; i < count + 1; i++) {
								await outOfSync(firstIndex + i * inc, index - 1 + i);
							}
							return callback(true);
						}
						this.fmc.showErrorMessage('2ND INDEX NOT FOUND');
						return callback(false);
					}
					this.fmc.showErrorMessage('1ST INDEX NOT FOUND');
					return callback(false);
				}
				this.fmc.showErrorMessage('NO REF WAYPOINT');
				return callback(false);
			}
			this.fmc.showErrorMessage('NO WAYPOINT INFOS');
			return callback(false);
		}
		this.fmc.showErrorMessage('NO REF WAYPOINT');
		return callback(false);
	}
}