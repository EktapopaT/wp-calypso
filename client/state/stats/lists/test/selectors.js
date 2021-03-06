/**
 * External dependencies
 */
import { expect } from 'chai';

/**
 * Internal dependencies
 */
import {
	getSiteStatsMaxPostsByDay,
	getSiteStatsForQuery,
	getSiteStatsPostStreakData,
	getSiteStatsPostsCountByDay,
	getSiteStatsTotalPostsForStreakQuery,
	getSiteStatsNormalizedData,
	isRequestingSiteStatsForQuery,
	getSiteStatsCSVData,
} from '../selectors';

describe( 'selectors', () => {
	beforeEach( () => {
		getSiteStatsPostStreakData.memoizedSelector.cache.clear();
		getSiteStatsMaxPostsByDay.memoizedSelector.cache.clear();
		getSiteStatsTotalPostsForStreakQuery.memoizedSelector.cache.clear();
		getSiteStatsNormalizedData.memoizedSelector.cache.clear();
	} );

	describe( 'isRequestingSiteStatsForQuery()', () => {
		it( 'should return false if no request exists', () => {
			const requesting = isRequestingSiteStatsForQuery( {
				stats: {
					lists: {
						requesting: {}
					}
				}
			}, 2916284, 'statsStreak', {} );

			expect( requesting ).to.be.false;
		} );

		it( 'should return false if query is not requesting', () => {
			const requesting = isRequestingSiteStatsForQuery( {
				stats: {
					lists: {
						requesting: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': false
								}
							}
						}
					}
				}
			}, 2916284, 'statsStreak', { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( requesting ).to.be.false;
		} );

		it( 'should return true if query is in progress', () => {
			const requesting = isRequestingSiteStatsForQuery( {
				stats: {
					lists: {
						requesting: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': true
								}
							}
						}
					}
				}
			}, 2916284, 'statsStreak', { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( requesting ).to.be.true;
		} );
	} );

	describe( 'getSiteStatsForQuery()', () => {
		it( 'should return null if no matching query results exist', () => {
			const stats = getSiteStatsForQuery( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, 'statsStreak', {} );

			expect( stats ).to.be.null;
		} );

		it( 'should return matching stats', () => {
			const stats = getSiteStatsForQuery( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										1461889800: 1,	// 2016-04-29 00:30:00 (UTC)
										1461972600: 1,	// 2016-04-29 23:30:00 (UTC)
										1462059000: 1 	// 2016-04-30 23:30:00 (UTC)
									}
								}
							}
						}
					}
				}
			}, 2916284, 'statsStreak', { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( stats ).to.eql( {
				1461889800: 1,
				1461972600: 1,
				1462059000: 1
			} );
		} );
	} );

	describe( 'getSiteStatsPostStreakData()', () => {
		it( 'should return an empty object if no matching query results exist', () => {
			const stats = getSiteStatsPostStreakData( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, {} );

			expect( stats ).to.eql( {} );
		} );

		it( 'should return properly formatted data if matching data for query exists', () => {
			const stats = getSiteStatsPostStreakData( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										streak: {},
										data: {
											1461889800: 1,	// 2016-04-29 00:30:00 (UTC)
											1461972600: 1,	// 2016-04-29 23:30:00 (UTC)
											1462059000: 1 	// 2016-04-30 23:30:00 (UTC)
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( stats ).to.eql( {
				'2016-04-29': 2,
				'2016-04-30': 1
			} );
		} );

		it( 'should handle malformed data if matching data for query exists', () => {
			const stats = getSiteStatsPostStreakData( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										streak: {},
										data: [ 1461889800 ]
									}
								}
							}
						}
					}
				}
			}, 2916284, { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( stats ).to.eql( {} );
		} );

		it( 'should return post streak data based on the GMT offset of the current site', () => {
			const state = {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									[ '[["endDate","2016-06-01"],["gmtOffset",-10],["startDate","2015-06-01"]]' ]: {
										streak: {},
										data: {
											1461889800: 1,	// 2016-04-29 00:30:00 (UTC)
											1461972600: 1,	// 2016-04-29 23:30:00 (UTC)
											1462059000: 1 	// 2016-04-30 23:30:00 (UTC)
										}
									},
									[ '[["endDate","2016-06-01"],["gmtOffset",0],["startDate","2015-06-01"]]' ]: {
										streak: {},
										data: {
											1461889800: 1,	// 2016-04-29 00:30:00 (UTC)
											1461972600: 1,	// 2016-04-29 23:30:00 (UTC)
											1462059000: 1 	// 2016-04-30 23:30:00 (UTC)
										}
									},
									[ '[["endDate","2016-06-01"],["gmtOffset",10],["startDate","2015-06-01"]]' ]: {
										streak: {},
										data: {
											1461889800: 1,	// 2016-04-29 00:30:00 (UTC)
											1461972600: 1,	// 2016-04-29 23:30:00 (UTC)
											1462059000: 1 	// 2016-04-30 23:30:00 (UTC)
										}
									}
								}
							}
						}
					}
				}
			};

			const stats1 = getSiteStatsPostStreakData( state, 2916284, {
				startDate: '2015-06-01',
				endDate: '2016-06-01',
				gmtOffset: -10
			} );

			const stats2 = getSiteStatsPostStreakData( state, 2916284, {
				startDate: '2015-06-01',
				endDate: '2016-06-01',
				gmtOffset: 0
			} );

			const stats3 = getSiteStatsPostStreakData( state, 2916284, {
				startDate: '2015-06-01',
				endDate: '2016-06-01',
				gmtOffset: 10
			} );

			expect( stats1 ).to.eql( {
				'2016-04-28': 1,
				'2016-04-29': 1,
				'2016-04-30': 1
			} );

			expect( stats2 ).to.eql( {
				'2016-04-29': 2,
				'2016-04-30': 1
			} );

			expect( stats3 ).to.eql( {
				'2016-04-29': 1,
				'2016-04-30': 1,
				'2016-05-01': 1
			} );
		} );
	} );

	describe( 'getSiteStatsTotalPostsForStreakQuery()', () => {
		it( 'should return null if no matching query results exist', () => {
			const stats = getSiteStatsTotalPostsForStreakQuery( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, {} );

			expect( stats ).to.eql( 0 );
		} );

		it( 'should properly correct number of total posts', () => {
			const stats = getSiteStatsTotalPostsForStreakQuery( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										data: {
											1461961382: 1,
											1464110402: 1,
											1464110448: 1
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( stats ).to.eql( 3 );
		} );
	} );

	describe( 'getSiteStatsMaxPostsByDay()', () => {
		it( 'should return null if no matching query results exist', () => {
			const stats = getSiteStatsMaxPostsByDay( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, {} );

			expect( stats ).to.be.null;
		} );

		it( 'should properly correct number of max posts grouped by day', () => {
			const stats = getSiteStatsMaxPostsByDay( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										data: {
											1461889800: 1, // 2016-04-29 00:30:00 (UTC)
											1461972600: 1, // 2016-04-29 23:30:00 (UTC)
											1462059000: 1  // 2016-04-30 23:30:00 (UTC)
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( stats ).to.eql( 2 );
		} );

		it( 'should compare numerically rather than lexically', () => {
			const stats = getSiteStatsMaxPostsByDay( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										data: {
											1461889800: 12, // 2016-04-29 00:30:00 (UTC)
											1462059000: 2 	// 2016-04-30 23:30:00 (UTC)
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, { startDate: '2015-06-01', endDate: '2016-06-01' } );

			expect( stats ).to.eql( 12 );
		} );
	} );

	describe( 'getSiteStatsPostsCountByDay()', () => {
		it( 'should return null if no matching query results exist', () => {
			const stats = getSiteStatsPostsCountByDay( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, {}, '2016-06-01' );

			expect( stats ).to.be.null;
		} );

		it( 'should properly correct number of max posts for a day', () => {
			const stats = getSiteStatsPostsCountByDay( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsStreak: {
									'[["endDate","2016-06-01"],["startDate","2015-06-01"]]': {
										data: {
											1461889800: 1,	// 2016-04-29 00:30:00 (UTC)
											1461972600: 1,	// 2016-04-29 23:30:00 (UTC)
											1462059000: 1	// 2016-04-30 23:30:00 (UTC)
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, { startDate: '2015-06-01', endDate: '2016-06-01' }, '2016-04-29' );

			expect( stats ).to.eql( 2 );
		} );
	} );

	describe( 'getSiteStatsNormalizedData()', () => {
		it( 'should return null if no matching query results exist', () => {
			const stats = getSiteStatsNormalizedData( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, 'stats', {} );

			expect( stats ).to.be.null;
		} );

		it( 'should return API payload data, if no normalizer exists', () => {
			const stats = getSiteStatsNormalizedData( {
				stats: {
					lists: {
						items: {
							2916284: {
								notReallyStats: {
									'[]': {
										bestPostTitleEver: 'Chicken and Ribs'
									}
								}
							}
						}
					}
				}
			}, 2916284, 'notReallyStats', {} );

			expect( stats ).to.eql( {
				bestPostTitleEver: 'Chicken and Ribs'
			} );
		} );

		it( 'should return normalized data, if normalizer exists', () => {
			const stats = getSiteStatsNormalizedData( {
				stats: {
					lists: {
						items: {
							2916284: {
								stats: {
									'[]': {
										stats: {
											posts: 2,
											views: 300,
											visitors: 400,
											views_best_day: '2010-09-29',
											views_best_day_total: 100
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, 'stats', {} );

			expect( stats ).to.eql( {
				posts: 2,
				views: 300,
				visitors: 400,
				viewsBestDay: '2010-09-29',
				viewsBestDayTotal: 100
			} );
		} );
	} );

	describe( 'getSiteStatsCSVData()', () => {
		it( 'should return an empty array if no matching query results exist', () => {
			const stats = getSiteStatsCSVData( {
				stats: {
					lists: {
						items: {}
					}
				}
			}, 2916284, 'stats', {} );

			expect( stats ).to.eql( [] );
		} );

		it( 'should return normalized data, if normalizer exists', () => {
			const stats = getSiteStatsCSVData( {
				stats: {
					lists: {
						items: {
							2916284: {
								statsCountryViews: {
									'[["date","2015-12-25"],["period","day"]]': {
										date: '2015-12-25',
										days: {
											'2015-12-25': {
												views: [ {
													country_code: 'US',
													views: 1
												} ],
												other_views: 0,
												total_views: 1
											}
										},
										'country-info': {
											US: {
												flag_icon: 'https://secure.gravatar.com/blavatar/5a83891a81b057fed56930a6aaaf7b3c?s=48',
												flat_flag_icon: 'https://secure.gravatar.com/blavatar/9f4faa5ad0c723474f7a6d810172447c?s=48',
												country_full: 'United States',
												map_region: '021'
											}
										}
									}
								}
							}
						}
					}
				}
			}, 2916284, 'statsCountryViews', {
				date: '2015-12-25',
				period: 'day',
			} );

			expect( stats ).to.eql( [ [ '"United States"', 1 ] ] );
		} );
	} );
} );
