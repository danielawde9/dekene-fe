import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Row,
  Col,
  Button,
  Select,
  Form,
  Modal,
  Switch,
  DatePicker,
  Tabs,
  Divider,
  Typography,
  Card,
  Table,
  InputNumber,
  Popconfirm,
  Input,
  message,
  Radio,
  Spin,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TransactionTable from "./TransactionTable";
import moment from "moment";
import { CLOSING_ALLOWED, DEFAULT_EXCHANGE_RATE } from "../utils/constant";

const { Content, Footer } = Layout;
const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const formatNumber = (value) => new Intl.NumberFormat().format(value);

const MainScreen = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openingDate, setOpeningDate] = useState(null);
  const [openingBalances, setOpeningBalances] = useState({ usd: 0, lbp: 0 });
  const [closingBalances, setClosingBalances] = useState({ usd: 0, lbp: 0 });
  const [credits, setCredits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [totals, setTotals] = useState({ usd: 0, lbp: 0 });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [manualDateEnabled, setManualDateEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    const savedBranch = localStorage.getItem('selectedBranch');
    return savedBranch ? JSON.parse(savedBranch) : null;
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [unpaidCredits, setUnpaidCredits] = useState([]);
  const [closedDates, setClosedDates] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [creditForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [saleForm] = Form.useForm();
  const [danielForm] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (selectedBranch !== null) {
      localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
    } else {
      localStorage.removeItem('selectedBranch');
    }
  }, [selectedBranch]);
  useEffect(() => {
    // Fetch branches on mount
    const fetchBranches = async () => {
      try {
        const { data: branchData, error: branchError } = await supabase
          .from("branches")
          .select("*");
        if (branchError) {
          toast.error("Error fetching branches: " + branchError.message);
        } else {
          setBranches(branchData);
        }
      } catch (error) {
        toast.error("Error fetching branches: " + error.message);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();

    // Load data from local storage
    const storedTransactions = localStorage.getItem("transactions");
    if (storedTransactions) {
      const { credits, payments, sales, withdrawals } =
        JSON.parse(storedTransactions);
      setCredits(credits || []);
      setPayments(payments || []);
      setSales(sales || []);
      setWithdrawals(withdrawals || []);
    }
  }, []);

  useEffect(() => {
    if (selectedBranch !== null) {
      const fetchDataForBranch = async () => {
        try {
          // Fetch opening balances for selectedBranch
          const { data: balanceData, error: balanceError } = await supabase
            .from("dailybalances")
            .select("*")
            .eq("branch_id", selectedBranch)
            .order("date", { ascending: false })
            .limit(1);

          if (balanceError) {
            toast.error(
              "Error fetching opening balances: " + balanceError.message
            );
            setOpeningBalances({ usd: 0, lbp: 0 });
          } else {
            const lastDayBalance = balanceData[0];
            setOpeningBalances({
              usd: lastDayBalance ? lastDayBalance.closing_usd : 0,
              lbp: lastDayBalance ? lastDayBalance.closing_lbp : 0,
            });
            const adjustedDate = lastDayBalance
              ? moment(lastDayBalance.date).add(1, "days").toDate()
              : new Date();
            setOpeningDate(adjustedDate);
          }

          // Fetch closed dates for selectedBranch
          const { data: closedDatesData, error: closedDatesError } =
            await supabase
              .from("dailybalances")
              .select("date")
              .eq("branch_id", selectedBranch);

          if (closedDatesError) {
            toast.error(
              "Error fetching closed dates: " + closedDatesError.message
            );
          } else {
            const dates = closedDatesData.map((item) =>
              moment(item.date).format("YYYY-MM-DD")
            );
            setClosedDates(dates);
          }

          // Fetch unpaid credits for selectedBranch
          const { data, error } = await supabase
            .from("credits")
            .select("*")
            .eq("status", false)
            .eq("branch_id", selectedBranch);

          if (error) {
            toast.error("Error fetching unpaid credits: " + error.message);
          } else {
            setUnpaidCredits(data);
          }

          // Fetch users
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*");
          if (userError) {
            toast.error("Error fetching users: " + userError.message);
          } else {
            setUsers(userData);
          }

          // Fetch settings
          const { data: settingsData, error: settingsError } = await supabase
            .from("settings")
            .select("*")
            .limit(1);
          if (settingsError) {
            toast.error("Error fetching settings: " + settingsError.message);
          } else if (settingsData.length > 0) {
            setManualDateEnabled(settingsData[0].manual_date_enabled);
          }
        } catch (error) {
          toast.error("Error fetching data: " + error.message);
        }
      };

      fetchDataForBranch();
    }
  }, [selectedBranch]);

  useEffect(() => {
    // Calculate totals whenever transactions change
    calculateTotals();
  }, [credits, payments, sales, withdrawals]);

  const calculateTotals = useCallback(() => {
    const totalCreditsUSD = credits.reduce(
      (acc, credit) => acc + credit.amount_usd,
      0
    );
    const totalCreditsLBP = credits.reduce(
      (acc, credit) => acc + credit.amount_lbp,
      0
    );
    const totalPaymentsUSD = payments.reduce(
      (acc, payment) =>
        payment.deduction_source !== "daniel" ? acc + payment.amount_usd : acc,
      0
    );
    const totalPaymentsLBP = payments.reduce(
      (acc, payment) =>
        payment.deduction_source !== "daniel" ? acc + payment.amount_lbp : acc,
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

    const netUSD =
      openingBalances.usd +
      totalSalesUSD -
      totalCreditsUSD -
      totalPaymentsUSD -
      totalWithdrawalsUSD;
    const netLBP =
      openingBalances.lbp +
      totalSalesLBP -
      totalCreditsLBP -
      totalPaymentsLBP -
      totalWithdrawalsLBP;
    setTotals({ usd: netUSD, lbp: netLBP });
  }, [credits, payments, sales, withdrawals, openingBalances]);

  const addTransaction = (type, transaction) => {
    switch (type) {
      case "credit":
        if (transaction.status) {
          transaction.amount_lbp = -Math.abs(transaction.amount_lbp);
          transaction.amount_usd = -Math.abs(transaction.amount_usd);
        }
        setCredits((prev) => [...prev, transaction]);
        break;
      case "payment":
        setPayments((prev) => [...prev, transaction]);
        break;
      case "sale":
        setSales((prev) => [...prev, transaction]);
        break;
      case "withdrawal":
        setWithdrawals((prev) => [...prev, transaction]);
        break;
      default:
        break;
    }
    localStorage.setItem(
      "transactions",
      JSON.stringify({ credits, payments, sales, withdrawals })
    );
  };

  const handleDelete = (type, key) => {
    switch (type) {
      case "credit":
        setCredits((prev) => prev.filter((item) => item.key !== key));
        break;
      case "payment":
        setPayments((prev) => prev.filter((item) => item.key !== key));
        break;
      case "sale":
        setSales((prev) => prev.filter((item) => item.key !== key));
        break;
      case "withdrawal":
        setWithdrawals((prev) => prev.filter((item) => item.key !== key));
        break;
      default:
        break;
    }
    localStorage.setItem(
      "transactions",
      JSON.stringify({ credits, payments, sales, withdrawals })
    );
  };

  const handleConfirm = () => {
    // Confirm opening balances
    setIsConfirmed(true);
    calculateTotals();
  };

  const handleClosingBalancesChange = (key, value) => {
    setClosingBalances((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select an employee to close the day.");
      return;
    }
    // Show modal for confirmation
    setIsModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    const { usd: closing_usd, lbp: closing_lbp } = closingBalances;
    // Ensure the date is a Date object
    const date = new Date(manualDateEnabled ? selectedDate : currentDate);

    // Add 3 hours to the date
    date.setHours(date.getHours() + 3);
    try {
      const { data: balanceData, error: balanceError } = await supabase
        .from("dailybalances")
        .insert([
          {
            date, // Use Lebanon timezone date
            opening_usd: openingBalances.usd,
            opening_lbp: openingBalances.lbp,
            closing_usd,
            closing_lbp,
            user_id: selectedUser,
            branch_id: selectedBranch,
          },
        ]);

      if (balanceError) throw balanceError;

      for (const credit of credits) {
        const { data, error: creditError } = await supabase
          .from("credits")
          .upsert(
            [
              {
                ...credit,
                date,
                user_id: selectedUser,
                branch_id: selectedBranch,
              },
            ],
            {
              onConflict: ["id"],
            }
          );
        if (creditError) throw creditError;
      }

      for (const payment of payments) {
        const { error: paymentError } = await supabase.from("payments").insert([
          {
            ...payment,
            date,
            user_id: selectedUser,
            branch_id: selectedBranch,
          },
        ]);
        if (paymentError) throw paymentError;
      }

      for (const sale of sales) {
        const { error: saleError } = await supabase.from("sales").insert([
          { ...sale, date, user_id: selectedUser, branch_id: selectedBranch },
        ]);
        if (saleError) throw saleError;
      }

      for (const withdrawal of withdrawals) {
        const { error: withdrawalError } = await supabase
          .from("daniel")
          .insert([
            {
              ...withdrawal,
              date,
              user_id: selectedUser,
              branch_id: selectedBranch,
            },
          ]);
        if (withdrawalError) throw withdrawalError;
      }

      toast.success("Daily balance and transactions submitted successfully!");

      setCredits([]);
      setPayments([]);
      setSales([]);
      setWithdrawals([]);
      setOpeningBalances({ usd: closing_usd, lbp: closing_lbp });
      setIsModalVisible(false);
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      toast.error("Error submitting transactions: " + error.message);
    }
  };

  const handleSwitchChange = async (checked) => {
    setManualDateEnabled(checked);
    try {
      const { data, error } = await supabase
        .from("settings")
        .update({ manual_date_enabled: checked })
        .eq("id", 1); // Assuming there is only one settings row
      if (error) throw error;
    } catch (error) {
      toast.error("Error updating settings: " + error.message);
    }
  };

  const handleUnpaidCreditSelection = (selectedCredits) => {
    const updatedCredits = unpaidCredits.filter((credit) =>
      selectedCredits.includes(credit.id)
    );

    updatedCredits.forEach((credit) => {
      credit.status = true; // Mark as paid
      addTransaction("credit", credit); // Add to the credits state
    });

    setUnpaidCredits((prev) =>
      prev.filter((credit) => !selectedCredits.includes(credit.id))
    );
  };

  const calculateTotalsAfterDaniel = () => {
    const closingBalanceInUSD =
      closingBalances.usd + closingBalances.lbp / exchangeRate;
    const totalsInUSD = totals.usd + totals.lbp / exchangeRate;

    const totalsAfterDanielUSD = closingBalanceInUSD - totalsInUSD;

    return {
      closingBalanceInUSD,
      totalsAfterDanielUSD,
    };
  };

  const { closingBalanceInUSD, totalsAfterDanielUSD } =
    calculateTotalsAfterDaniel();

  const isClosingAllowed = Math.abs(totalsAfterDanielUSD) <= CLOSING_ALLOWED;

  const disableDates = (current) => {
    const tomorrow = moment().endOf("day");
    const isClosedDate = closedDates.includes(current.format("YYYY-MM-DD"));
    return current && (current > tomorrow || isClosedDate);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsEditModalVisible(true);
    editForm.setFieldsValue(item);
  };

  const handleEditSubmit = (values) => {
    const { key, type, ...rest } = values;
    switch (type) {
      case "credit":
        setCredits((prev) =>
          prev.map((item) => (item.key === key ? { ...item, ...rest } : item))
        );
        break;
      case "payment":
        setPayments((prev) =>
          prev.map((item) => (item.key === key ? { ...item, ...rest } : item))
        );
        break;
      case "sale":
        setSales((prev) =>
          prev.map((item) => (item.key === key ? { ...item, ...rest } : item))
        );
        break;
      case "withdrawal":
        setWithdrawals((prev) =>
          prev.map((item) => (item.key === key ? { ...item, ...rest } : item))
        );
        break;
      default:
        break;
    }
    setIsEditModalVisible(false);
    localStorage.setItem(
      "transactions",
      JSON.stringify({ credits, payments, sales, withdrawals })
    );
    message.success("Transaction updated successfully!");
  };

  const renderEditFormFields = () => {
    if (!editingItem) return null;
    const { type } = editingItem;

    switch (type) {
      case "credit":
        return (
          <>
            <Form.Item
              name="amount_usd"
              label="Amount USD"
              rules={[
                {
                  required: true,
                  message: "Please input amount in USD!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="amount_lbp"
              label="Amount LBP"
              rules={[
                {
                  required: true,
                  message: "Please input amount in LBP!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="person"
              label="Person"
              rules={[
                {
                  required: true,
                  message: "Please input the person!",
                },
              ]}
            >
              <Input />
            </Form.Item>
          </>
        );
      case "payment":
        return (
          <>
            <Form.Item
              name="amount_usd"
              label="Amount USD"
              rules={[
                {
                  required: true,
                  message: "Please input amount in USD!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="amount_lbp"
              label="Amount LBP"
              rules={[
                {
                  required: true,
                  message: "Please input amount in LBP!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="reference_number" label="Reference Number">
              <Input placeholder="Add a Reference Number" />
            </Form.Item>
            <Form.Item
              name="cause"
              label="Cause"
              rules={[
                {
                  required: true,
                  message: "Please input the cause!",
                },
              ]}
            >
              <Input placeholder="Add a Cause" />
            </Form.Item>
            <Form.Item
              name="deduction_source"
              label="Deduction Source"
              rules={[
                {
                  required: true,
                  message: "Please select the deduction source!",
                },
              ]}
            >
              <Select placeholder="Select deduction source">
                <Option value="current">Current Closing</Option>
                <Option value="daniel">Daniel</Option>
              </Select>
            </Form.Item>
          </>
        );
      case "sale":
        return (
          <>
            <Form.Item
              name="amount_usd"
              label="Amount USD"
              rules={[
                {
                  required: true,
                  message: "Please input amount in USD!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="amount_lbp"
              label="Amount LBP"
              rules={[
                {
                  required: true,
                  message: "Please input amount in LBP!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </>
        );
      case "withdrawal":
        return (
          <>
            <Form.Item
              name="amount_usd"
              label="Amount USD"
              rules={[
                {
                  required: true,
                  message: "Please input amount in USD!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="amount_lbp"
              label="Amount LBP"
              rules={[
                {
                  required: true,
                  message: "Please input amount in LBP!",
                },
              ]}
            >
              <InputNumber
                formatter={formatNumber}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (loadingBranches) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <Spin size="large" tip="Loading branches..." />
      </div>
    );
  }

  if (selectedBranch === null) {
    return (
      <Layout className="layout">
        <ToastContainer />
        <Content style={{ padding: "16px" }}>
          <Card>

            <div className="site-layout-content">
              <h1>Select Branch</h1>
              <Form>
                <Form.Item
                  name="branch_id"
                  label="Branch"
                  rules={[
                    {
                      required: true,
                      message: "Please select a branch!",
                    },
                  ]}
                >
                  <Select
                    placeholder="Select a branch"
                    onChange={(value) => setSelectedBranch(value)}
                  >
                    {branches.map((branch) => (
                      <Option key={branch.id} value={branch.id}>
                        {branch.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
            </div>
          </Card>

        </Content>
        <Footer style={{ textAlign: "center" }}>
          Dekene Web App ©2024, Developed by{" "}
          <a href="https://danielawde9.com">Daniel Awde</a>
        </Footer>
      </Layout>
    );
  }

  return (
    <Layout className="layout">
      <ToastContainer />
      <Content style={{ padding: "0 16px" }}>
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Main View" key="1">
            <div className="site-layout-content">
              <h1>Financial Tracking App</h1>
              <Row gutter={16}>
                <Col xs={24}>
                  <Card
                    title="Opening Balance"
                    actions={[
                      <Button
                        type="primary"
                        onClick={handleConfirm}
                        disabled={isConfirmed}
                      >
                        Confirm
                      </Button>,
                    ]}
                  >
                    <Typography.Title level={5}>
                      Date:{" "}
                      {openingDate
                        ? openingDate.toISOString().split("T")[0]
                        : "Loading..."}
                    </Typography.Title>
                    <Typography.Title level={5}>
                      Closing USD: {formatNumber(openingBalances.usd)}
                    </Typography.Title>
                    <Typography.Title level={5}>
                      Closing LBP: {formatNumber(openingBalances.lbp)}
                    </Typography.Title>
                    <Typography.Text>
                      Please ensure that the amount of money currently available
                      matches the amount displayed. If they match, kindly click
                      "confirm" to continue.
                    </Typography.Text>
                  </Card>
                </Col>
              </Row>
              {isConfirmed && (
                <>
                  <Row gutter={16}>
                    <Col
                      xs={24}
                      sm={12}
                      style={{ marginTop: "20px" }}
                    >
                      <Card title="Credits">
                        <Form
                          form={creditForm}
                          initialValues={{
                            amount_usd: 0,
                            amount_lbp: 0,
                            status: false, // Default to "Unpaid"
                          }}

                          onFinish={(values) => {
                            addTransaction("credit", {
                              ...values,
                              status: values.status,
                              key: Date.now(),
                            });
                            creditForm.resetFields();
                          }}
                        >
                          <Form.Item
                            name="amount_usd"
                            label="Amount USD"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in USD!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="amount_lbp"
                            label="Amount LBP"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in LBP!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="person"
                            label="Person"
                            rules={[
                              {
                                required: true,
                                message: "Please input the person!",
                              },
                            ]}
                          >
                            <Input placeholder="Add a person" />
                          </Form.Item>
                          <Form.Item
                            name="status"
                            label="Status"
                            rules={[
                              {
                                required: true,
                                message: "Please select the status!",
                              },
                            ]}
                          >
                            <Radio.Group>
                              <Radio value={true}>Paid</Radio>
                              <Radio value={false}>Unpaid</Radio>
                            </Radio.Group>
                          </Form.Item>
                          <Form.Item>
                            <Button
                              type="primary"
                              htmlType="submit"
                            >
                              Add Credit
                            </Button>
                          </Form.Item>
                        </Form>
                        <Form.Item label="Unpaid Credits">
                          <Select
                            mode="multiple"
                            placeholder="Select unpaid credits to mark as paid"
                            onChange={handleUnpaidCreditSelection}
                          >
                            {unpaidCredits.map((credit) => (
                              <Option
                                key={credit.id}
                                value={credit.id}
                              >
                                {`USD: ${formatNumber(
                                  credit.amount_usd
                                )}, LBP: ${formatNumber(
                                  credit.amount_lbp
                                )}, Person: ${credit.person}`}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Table
                          scroll={{ x: true }}
                          dataSource={credits}
                          columns={[
                            {
                              title: "Amount USD",
                              dataIndex: "amount_usd",
                              key: "amount_usd",
                              render: formatNumber,
                            },
                            {
                              title: "Amount LBP",
                              dataIndex: "amount_lbp",
                              key: "amount_lbp",
                              render: formatNumber,
                            },
                            {
                              title: "Person",
                              dataIndex: "person",
                              key: "person",
                            },
                            {
                              title: "Status",
                              dataIndex: "status",
                              key: "status",
                              render: (status) => (status ? "Paid" : "Unpaid"),
                            },
                            {
                              title: "Action",
                              key: "action",
                              render: (_, record) => (
                                <>
                                  <Button
                                    type="link"
                                    onClick={() =>
                                      handleEdit({ ...record, type: "credit" })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Popconfirm
                                    title="Sure to delete?"
                                    onConfirm={() =>
                                      handleDelete("credit", record.key)
                                    }
                                  >
                                    <Button type="link">Delete</Button>
                                  </Popconfirm>
                                </>
                              ),
                            },
                          ]}
                          rowKey="key"
                        />
                      </Card>
                    </Col>
                    <Col
                      xs={24}
                      sm={12}
                    >
                      <Card
                        title="Payments"
                        style={{ marginTop: 20 }}
                      >
                        <Form
                          form={paymentForm}
                          initialValues={{
                            amount_usd: 0,
                            amount_lbp: 0,
                            reference_number: "ref",
                            cause: "",
                            deduction_source: "current",
                          }}

                          onFinish={(values) => {
                            addTransaction("payment", {
                              ...values,
                              key: Date.now(),
                            });
                            paymentForm.resetFields();
                          }}

                        >
                          <Form.Item
                            name="amount_usd"
                            label="Amount USD"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in USD!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="amount_lbp"
                            label="Amount LBP"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in LBP!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="reference_number"
                            label="Reference Number"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in USD!",
                              },
                            ]}
                          >
                            <Input placeholder="Add a Reference Number" />
                          </Form.Item>
                          <Form.Item
                            name="cause"
                            label="Cause"
                            rules={[
                              {
                                required: true,
                                message: "Please input the cause!",
                              },
                            ]}
                          >
                            <Input placeholder="Add a Cause" />
                          </Form.Item>
                          <Form.Item
                            name="deduction_source"
                            label="Deduction Source"
                            rules={[
                              {
                                required: true,
                                message: "Please select the deduction source!",
                              },
                            ]}
                          >
                            <Select placeholder="Select deduction source">
                              <Option value="current">Current Closing</Option>
                              <Option value="daniel">Daniel</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item>
                            <Button
                              type="primary"
                              htmlType="submit"
                            >
                              Add Payment
                            </Button>
                          </Form.Item>
                        </Form>
                        <Table
                          dataSource={payments}
                          scroll={{ x: true }}
                          columns={[
                            {
                              title: "Amount USD",
                              dataIndex: "amount_usd",
                              key: "amount_usd",
                              render: formatNumber,
                            },
                            {
                              title: "Amount LBP",
                              dataIndex: "amount_lbp",
                              key: "amount_lbp",
                              render: formatNumber,
                            },
                            {
                              title: "Reference Number",
                              dataIndex: "reference_number",
                              key: "reference_number",
                            },
                            {
                              title: "Cause",
                              dataIndex: "cause",
                              key: "cause",
                            },
                            {
                              title: "Deduction Source",
                              dataIndex: "deduction_source",
                              key: "deduction_source",
                            },
                            {
                              title: "Action",
                              key: "action",
                              render: (_, record) => (
                                <>
                                  <Button
                                    type="link"
                                    onClick={() =>
                                      handleEdit({ ...record, type: "payment" })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Popconfirm
                                    title="Sure to delete?"
                                    onConfirm={() =>
                                      handleDelete("payment", record.key)
                                    }
                                  >
                                    <Button type="link">Delete</Button>
                                  </Popconfirm>
                                </>
                              ),
                            },
                          ]}
                          rowKey="key"
                        />
                      </Card>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col
                      xs={24}
                      sm={12}
                    >
                      <Card
                        title="Sales"
                        style={{ marginTop: "20px" }}
                      >
                        <Form
                          form={saleForm}
                          initialValues={{
                            amount_usd: 0,
                            amount_lbp: 0,
                          }}
                          onFinish={(values) => {
                            addTransaction("sale", {
                              ...values,
                              key: Date.now(),
                            });
                            saleForm.resetFields();
                          }}
                        >
                          <Form.Item
                            name="amount_usd"
                            label="Amount USD"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in USD!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="amount_lbp"
                            label="Amount LBP"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in LBP!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item>
                            <Button
                              type="primary"
                              htmlType="submit"
                            >
                              Add Sale
                            </Button>
                          </Form.Item>
                        </Form>
                        <Table
                          dataSource={sales}
                          columns={[
                            {
                              title: "Amount USD",
                              dataIndex: "amount_usd",
                              key: "amount_usd",
                              render: formatNumber,
                            },
                            {
                              title: "Amount LBP",
                              dataIndex: "amount_lbp",
                              key: "amount_lbp",
                              render: formatNumber,
                            },
                            {
                              title: "Action",
                              key: "action",
                              render: (_, record) => (
                                <>
                                  <Button
                                    type="link"
                                    onClick={() =>
                                      handleEdit({ ...record, type: "sale" })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Popconfirm
                                    title="Sure to delete?"
                                    onConfirm={() =>
                                      handleDelete("sale", record.key)
                                    }
                                  >
                                    <Button type="link">Delete</Button>
                                  </Popconfirm>
                                </>
                              ),
                            },
                          ]}
                          rowKey="key"
                        />
                      </Card>
                    </Col>
                    <Col
                      xs={24}
                      sm={12}
                    >
                      <Card
                        title="Daniel"
                        style={{ marginTop: "20px" }}
                      >
                        <Form
                          form={danielForm}
                          initialValues={{
                            amount_usd: 0,
                            amount_lbp: 0,
                          }}
                          onFinish={(values) => {
                            addTransaction("withdrawal", {
                              ...values,
                              key: Date.now(),
                            });
                            danielForm.resetFields();
                          }}
                        >
                          <Form.Item
                            name="amount_usd"
                            label="Amount USD"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in USD!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="amount_lbp"
                            label="Amount LBP"
                            rules={[
                              {
                                required: true,
                                message: "Please input amount in LBP!",
                              },
                            ]}
                          >
                            <InputNumber
                              formatter={formatNumber}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item>
                            <Button
                              type="primary"
                              htmlType="submit"
                            >
                              Add Withdrawal (Daniel)
                            </Button>
                          </Form.Item>
                        </Form>
                        <Table
                          dataSource={withdrawals}
                          columns={[
                            {
                              title: "Amount USD",
                              dataIndex: "amount_usd",
                              key: "amount_usd",
                              render: formatNumber,
                            },
                            {
                              title: "Amount LBP",
                              dataIndex: "amount_lbp",
                              key: "amount_lbp",
                              render: formatNumber,
                            },
                            {
                              title: "Action",
                              key: "action",
                              render: (_, record) => (
                                <>
                                  <Button
                                    type="link"
                                    onClick={() =>
                                      handleEdit({
                                        ...record,
                                        type: "withdrawal",
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Popconfirm
                                    title="Sure to delete?"
                                    onConfirm={() =>
                                      handleDelete("withdrawal", record.key)
                                    }
                                  >
                                    <Button type="link">Delete</Button>
                                  </Popconfirm>
                                </>
                              ),
                            },
                          ]}
                          rowKey="key"
                        />
                      </Card>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col
                      xs={24}
                      sm={12}
                    >
                      <Card
                        title="Totals"
                        style={{ marginTop: "20px" }}
                        actions={[
                          <Typography.Title level={4}>
                            Total in USD:{" "}
                            {(
                              totals.usd +
                              totals.lbp / exchangeRate
                            ).toLocaleString()}
                          </Typography.Title>,
                        ]}
                      >
                        <p>USD: {formatNumber(totals.usd)}</p>
                        <p>LBP: {formatNumber(totals.lbp)}</p>
                        <Form.Item
                          label="Exchange Rate"
                          style={{ marginTop: "10px" }}
                        >
                          <InputNumber
                            prefix="LBP"
                            formatter={formatNumber}
                            defaultValue={DEFAULT_EXCHANGE_RATE}
                            onChange={(value) => setExchangeRate(value)}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </Card>
                    </Col>
                    <Col
                      xs={24}
                      sm={12}
                    >
                      <Card
                        title="Closing Balance"
                        style={{ marginTop: "20px" }}
                      >
                        <Form>
                          <Form.Item label="Closing Balance USD">
                            <InputNumber
                              formatter={formatNumber}
                              min={0}
                              value={closingBalances.usd}
                              onChange={(value) =>
                                handleClosingBalancesChange("usd", value)
                              }
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item label="Closing Balance LBP">
                            <InputNumber
                              min={0}
                              formatter={formatNumber}
                              value={closingBalances.lbp}
                              onChange={(value) =>
                                handleClosingBalancesChange("lbp", value)
                              }
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name="branch_id"
                            label="Branch"
                            rules={[
                              {
                                required: true,
                                message: "Please select a branch!",
                              },
                            ]}
                          >
                            <Select
                              placeholder="Select a branch"
                              onChange={(value) => setSelectedBranch(value)}
                            >
                              {branches.map((branch) => (
                                <Option
                                  key={branch.id}
                                  value={branch.id}
                                >
                                  {branch.name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Typography.Text>
                            Total in USD: {closingBalanceInUSD.toLocaleString()}
                          </Typography.Text>
                          <Divider />
                          <Typography.Text
                            style={{
                              color:
                                totalsAfterDanielUSD.toLocaleString() <
                                  CLOSING_ALLOWED &&
                                  totalsAfterDanielUSD.toLocaleString() >= 0
                                  ? "green"
                                  : "red",
                            }}
                          >
                            Your closing difference amount is :{" "}
                            {totalsAfterDanielUSD.toLocaleString()}
                          </Typography.Text>
                          <Divider />
                          <Form.Item
                            name="closing_employee"
                            label="Select Closing Employee"
                            rules={[
                              {
                                required: true,
                                message: "Please select an employee!",
                              },
                            ]}
                          >
                            <Select
                              placeholder="Select an employee"
                              onChange={(value) => setSelectedUser(value)}
                            >
                              {users.map((user) => (
                                <Option
                                  key={user.id}
                                  value={user.id}
                                >
                                  {user.name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                          {manualDateEnabled && (
                            <Form.Item
                              name="closing_date"
                              label="Select Closing Date"
                              rules={[
                                {
                                  required: true,
                                  message: "Please select a date!",
                                },
                              ]}
                            >
                              <DatePicker
                                format="YYYY-MM-DD"
                                onChange={(date) => setSelectedDate(date)}
                                disabledDate={disableDates}
                              />
                            </Form.Item>
                          )}
                          <Form.Item>
                            <Button
                              type="primary"
                              onClick={handleSubmit}
                              disabled={!isClosingAllowed}
                            >
                              Close Today
                            </Button>
                            {!isClosingAllowed && (
                              <Typography.Text type="danger">
                                Your closing amount is not correct, greater than
                                ${CLOSING_ALLOWED}
                              </Typography.Text>
                            )}
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                </>
              )}
              <Modal
                title="Confirm Closing"
                open={isModalVisible}
                onOk={handleConfirmSubmit}
                onCancel={() => setIsModalVisible(false)}
                width={800} // Increase the width if needed
              >
                <p>Are you sure you want to close the day?</p>
                <p>Summary of added data:</p>

                {/* Credits Table */}
                {credits.length > 0 && (
                  <>
                    <Typography.Title level={5}>Credits</Typography.Title>
                    <Table
                      dataSource={credits}
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                        {
                          title: "Person",
                          dataIndex: "person",
                          key: "person",
                        },
                        {
                          title: "Status",
                          dataIndex: "status",
                          key: "status",
                          render: (status) => (status ? "Paid" : "Unpaid"),
                        },
                      ]}
                      pagination={false}
                      rowKey="key"
                    />
                  </>
                )}

                {/* Payments Table */}
                {payments.length > 0 && (
                  <>
                    <Typography.Title level={5}>Payments</Typography.Title>
                    <Table
                      dataSource={payments}
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                        {
                          title: "Reference Number",
                          dataIndex: "reference_number",
                          key: "reference_number",
                        },
                        {
                          title: "Cause",
                          dataIndex: "cause",
                          key: "cause",
                        },
                        {
                          title: "Deduction Source",
                          dataIndex: "deduction_source",
                          key: "deduction_source",
                        },
                      ]}
                      pagination={false}
                      rowKey="key"
                    />
                  </>
                )}

                {/* Sales Table */}
                {sales.length > 0 && (
                  <>
                    <Typography.Title level={5}>Sales</Typography.Title>
                    <Table
                      dataSource={sales}
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                      ]}
                      pagination={false}
                      rowKey="key"
                    />
                  </>
                )}

                {/* Withdrawals Table */}
                {withdrawals.length > 0 && (
                  <>
                    <Typography.Title level={5}>Withdrawals</Typography.Title>
                    <Table
                      dataSource={withdrawals}
                      columns={[
                        {
                          title: "Amount USD",
                          dataIndex: "amount_usd",
                          key: "amount_usd",
                          render: formatNumber,
                        },
                        {
                          title: "Amount LBP",
                          dataIndex: "amount_lbp",
                          key: "amount_lbp",
                          render: formatNumber,
                        },
                      ]}
                      pagination={false}
                      rowKey="key"
                    />
                  </>
                )}
              </Modal>

              <Modal
                title="Edit Transaction"
                open={isEditModalVisible}
                onOk={() => {
                  editForm.validateFields().then((values) => {
                    handleEditSubmit(values);
                    editForm.resetFields();
                  });
                }}
                onCancel={() => setIsEditModalVisible(false)}
              >
                <Form
                  initialValues={editingItem}
                  onFinish={handleEditSubmit}
                  form={editForm}
                >
                  <Form.Item name="key" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="type" hidden>
                    <Input />
                  </Form.Item>
                  {renderEditFormFields()}
                </Form>
              </Modal>
            </div>
          </Tabs.TabPane>
          {user.role === "admin" && (
            <Tabs.TabPane tab="Admin Dashboard" key="2">
              <div style={{ marginTop: "40px" }}>
                <h2>Admin Dashboard</h2>
                <p>Switch to enable user to enter date manually</p>
                <div style={{ marginTop: "20px" }}>
                  <Switch
                    checked={manualDateEnabled}
                    onChange={handleSwitchChange}
                    checkedChildren="Manual Date"
                    unCheckedChildren="Auto Date"
                  />
                </div>
                <Divider />
                <TransactionTable
                  adminUserId={user.id}
                  exchangeRate={DEFAULT_EXCHANGE_RATE}
                />
              </div>
            </Tabs.TabPane>
          )}
        </Tabs>

      </Content>
      <Footer style={{ textAlign: "center", display: "flex", "gap": "2rem", justifyContent: "center", alignItems: "center" }}>
        <div>
          Dekene Web App ©2024, Developed by{" "}
          <a href="https://danielawde9.com">Daniel Awde</a>
        </div>
        <Button
          type="primary"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Footer>
    </Layout>
  );
};

export default MainScreen;