import React, { useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Row,
  Col,
  Card,
  Button,
  Select,
  Form,
  Modal,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import DailyBalance from "./components/DailyBalance";
import Credits from "./components/Credits";
import Payments from "./components/Payments";
import Sales from "./components/Sales";
import Withdrawals from "./components/Withdrawals";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatNumber } from "./utils/formatNumber";

const { Header, Content, Footer } = Layout;
const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function MainScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openingBalances, setOpeningBalances] = useState({ usd: 0, lbp: 0 });
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [totals, setTotals] = useState({
    beforeWithdrawals: { usd: 0, lbp: 0 },
    afterWithdrawals: { usd: 0, lbp: 0 },
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    async function fetchOpeningBalances() {
      const { data, error } = await supabase
        .from("dailybalances")
        .select("*")
        .order("date", { ascending: false })
        .limit(1);

      if (error) {
        toast.error("Error fetching opening balances: " + error.message);
      } else {
        const lastDayBalance = data[0];
        console.log(lastDayBalance, "ll");
        setOpeningBalances({
          date: lastDayBalance ? lastDayBalance.date : 0,
          usd: lastDayBalance ? lastDayBalance.closing_usd : 0,
          lbp: lastDayBalance ? lastDayBalance.closing_lbp : 0,
        });
      }
    }

    async function fetchUsers() {
      const { data, error } = await supabase.from("users").select("*");

      if (error) {
        toast.error("Error fetching users: " + error.message);
      } else {
        setUsers(data);
      }
    }

    fetchOpeningBalances();
    fetchUsers();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [credits, payments, sales, withdrawals]);

  const addCredit = (credit) => {
    setCredits([...credits, credit]);
  };

  const addPayment = (payment) => {
    setPayments([...payments, payment]);
  };

  const addSale = (sale) => {
    setSales([...sales, sale]);
  };

  const addWithdrawal = (withdrawal) => {
    setWithdrawals([...withdrawals, withdrawal]);
  };

  const calculateTotals = () => {
    const totalCreditsUSD = credits.reduce(
      (acc, credit) => acc + credit.amount_usd,
      0
    );
    const totalCreditsLBP = credits.reduce(
      (acc, credit) => acc + credit.amount_lbp,
      0
    );
    const totalPaymentsUSD = payments.reduce(
      (acc, payment) => acc + payment.amount_usd,
      0
    );
    const totalPaymentsLBP = payments.reduce(
      (acc, payment) => acc + payment.amount_lbp,
      0
    );
    const totalSalesUSD = sales.reduce((acc, sale) => acc + sale.amount_usd, 0);
    const totalSalesLBP = sales.reduce((acc, sale) => acc + sale.amount_lbp, 0);
    const totalWithdrawalsUSD = withdrawals.reduce(
      (acc, withdrawal) => acc + withdrawal.amount_usd,
      0
    );
    const totalWithdrawalsLBP = withdrawals.reduce(
      (acc, withdrawal) => acc + withdrawal.amount_lbp,
      0
    );

    const beforeWithdrawalsUSD =
      openingBalances.usd - totalCreditsUSD - totalPaymentsUSD + totalSalesUSD;
    const beforeWithdrawalsLBP =
      openingBalances.lbp - totalCreditsLBP - totalPaymentsLBP + totalSalesLBP;

    const afterWithdrawalsUSD = beforeWithdrawalsUSD - totalWithdrawalsUSD;
    const afterWithdrawalsLBP = beforeWithdrawalsLBP - totalWithdrawalsLBP;

    setTotals({
      beforeWithdrawals: {
        usd: beforeWithdrawalsUSD,
        lbp: beforeWithdrawalsLBP,
      },
      afterWithdrawals: { usd: afterWithdrawalsUSD, lbp: afterWithdrawalsLBP },
    });
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select an employee to close the day.");
      return;
    }
    if (sales.length === 0 || withdrawals.length === 0) {
      toast.error("Please enter at least one sale and one withdrawal.");
      return;
    }
    setIsModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const { usd: closing_usd, lbp: closing_lbp } = totals.afterWithdrawals;
    const date = currentDate.toISOString().split("T")[0];

    const { data, error } = await supabase.from("dailybalances").insert([
      {
        date,
        opening_usd: openingBalances.usd,
        opening_lbp: openingBalances.lbp,
        closing_usd,
        closing_lbp,
        user_id: selectedUser, // Use the selected user ID
      },
    ]);

    if (error) {
      toast.error("Error submitting daily balance: " + error.message);
    } else {
      toast.success("Daily balance submitted successfully!");
      // Clear all the state after submission
      setCredits([]);
      setPayments([]);
      setSales([]);
      setWithdrawals([]);
      setOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
    }
    setIsModalVisible(false);
  };

  return (
    <Layout className="layout">
      <ToastContainer />
      <Content style={{ padding: "0 50px" }}>
        <div className="site-layout-content">
          <h1>Financial Tracking App</h1>
          <Row gutter={16}>
            <Col span={24}>
              <DailyBalance openingBalances={openingBalances} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Credits addCredit={addCredit} />
            </Col>
            <Col span={12}>
              <Payments addPayment={addPayment} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Sales addSale={addSale} />
            </Col>
            <Col span={12}>
              <Withdrawals addWithdrawal={addWithdrawal} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Card title="Totals Before Daniel (Withdrawals)">
                <p>USD: {formatNumber(totals.beforeWithdrawals.usd)}</p>
                <p>LBP: {formatNumber(totals.beforeWithdrawals.lbp)}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Totals After Daniel (Withdrawals)">
                <p>USD: {formatNumber(totals.afterWithdrawals.usd)}</p>
                <p>LBP: {formatNumber(totals.afterWithdrawals.lbp)}</p>
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "20px", textAlign: "center" }}>
            <Col span={24}>
              <Form>
                <Form.Item
                  name="closing_employee"
                  label="Select Closing Employee"
                  rules={[
                    { required: true, message: "Please select an employee!" },
                  ]}
                >
                  <Select
                    placeholder="Select an employee"
                    onChange={(value) => setSelectedUser(value)}
                  >
                    {users.map((user) => (
                      <Option key={user.id} value={user.id}>
                        {user.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleSubmit}>
                    Close Today
                  </Button>
                </Form.Item>
              </Form>
            </Col>
          </Row>
          <Modal
            title="Confirm Closing"
            open={isModalVisible}
            onOk={handleConfirmSubmit}
            onCancel={() => setIsModalVisible(false)}
          >
            <p>Are you sure you want to close the day?</p>
            <p>Summary of added data:</p>
            <p>Credits: {credits.length}</p>
            <p>Payments: {payments.length}</p>
            <p>Sales: {sales.length}</p>
            <p>Withdrawals: {withdrawals.length}</p>
          </Modal>
        </div>
      </Content>
      <Footer style={{ textAlign: "center" }}>Dekene Web App ©2024</Footer>
    </Layout>
  );
}

export default MainScreen;
