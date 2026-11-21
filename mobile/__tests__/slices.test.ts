import leaderboardReducer, { setPage, setSort } from "../store/leaderboardSlice";
import pointsReducer, { setPointsPage, setPointsSort } from "../store/pointsSlice";
import studentReducer, { setStudentFilters, setStudentPage, setStudentSearch, setStudentSort } from "../store/studentSlice";

describe("server-list filters", () => {
  it("resets leaderboard pagination when changing sort and toggles direction for the active sort", () => {
    let state = leaderboardReducer(undefined, setPage(3));
    state = leaderboardReducer(state, setSort("grade"));
    expect(state).toMatchObject({ page: 1, sort: "grade", order: "desc" });
    state = leaderboardReducer(state, setSort("grade"));
    expect(state.order).toBe("asc");
  });

  it("resets teacher student pagination when search or sorting changes", () => {
    let state = studentReducer(undefined, setStudentPage(4));
    state = studentReducer(state, setStudentSearch("Ari"));
    expect(state).toMatchObject({ page: 1, search: "Ari" });
    state = studentReducer(state, setStudentPage(2));
    state = studentReducer(state, setStudentSort("points"));
    expect(state).toMatchObject({ page: 1, sort: "points" });
    state = studentReducer(state, setStudentPage(3));
    state = studentReducer(state, setStudentFilters({ grade: "Year 10", minPoints: 25, maxPoints: 90 }));
    expect(state).toMatchObject({ page: 1, grade: "Year 10", minPoints: 25, maxPoints: 90 });
  });

  it("resets point history pagination when changing sort", () => {
    let state = pointsReducer(undefined, setPointsPage(3));
    state = pointsReducer(state, setPointsSort("amount"));
    expect(state).toMatchObject({ page: 1, sort: "amount", order: "desc" });
  });
});
